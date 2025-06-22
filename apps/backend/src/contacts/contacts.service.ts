// apps/backend/src/contacts/contacts.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Prisma } from '@prisma/client';
import Papa from 'papaparse';

interface GoogleCsvRow {
  // Name related fields
  'First Name'?: string;
  'Given Name'?: string;
  'Middle Name'?: string;
  'Family Name'?: string;
  'Last Name'?: string;
  Nickname?: string;

  // Email fields (Google exports up to a certain number, e.g., 3 or more)
  'E-mail 1 - Type'?: string;
  'E-mail 1 - Value'?: string;
  'E-mail 2 - Type'?: string;
  'E-mail 2 - Value'?: string;
  'E-mail 3 - Type'?: string;
  'E-mail 3 - Value'?: string;
  // ... add more if you observe them in your exports

  // Phone fields
  'Phone 1 - Type'?: string;
  'Phone 1 - Value'?: string;
  'Phone 2 - Type'?: string;
  'Phone 2 - Value'?: string;
  'Phone 3 - Type'?: string;
  'Phone 3 - Value'?: string;
  // ... add more

  // Other potentially useful fields
  'Organization 1 - Name'?: string;
  'Organization 1 - Title'?: string;
  Notes?: string;

  // Catch-all for any other columns PapaParse might find
  [key: string]: any;
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
  constructor(private prisma: PrismaService) {}

  async create(createContactDto: CreateContactDto, userId: string) {
    const { name, email, phone } = createContactDto;

    // Check for duplicates based on your unique constraints
    if (email) {
      const existingByEmail = await this.prisma.contact.findFirst({
        where: {
          ownerId: userId,
          email: email,
        },
      });
      if (existingByEmail) {
        throw new ConflictException(
          `Contact with email ${email} already exists.`,
        );
      }
    }
    if (phone) {
      const existingByPhone = await this.prisma.contact.findFirst({
        where: {
          ownerId: userId,
          phone: phone,
        },
      });
      if (existingByPhone) {
        throw new ConflictException(
          `Contact with phone ${phone} already exists.`,
        );
      }
    }

    return this.prisma.contact.create({
      data: {
        name,
        email,
        phone,
        ownerId: userId,
      },
    });
  }

  async update(id: string, updateContactDto: UpdateContactDto, userId: string) {
    // First, ensure the user owns this contact
    await this.findOne(id, userId); // This will throw if not found or not owned

    // Optional: Handle unique constraint conflicts on update
    if (updateContactDto.email) {
      const existingByEmail = await this.prisma.contact.findFirst({
        where: {
          ownerId: userId,
          email: updateContactDto.email,
          NOT: { id: id },
        },
      });
      if (existingByEmail) {
        throw new ConflictException(
          `Another contact with email ${updateContactDto.email} already exists.`,
        );
      }
    }
    // Similar check for phone if needed

    return this.prisma.contact.update({
      where: { id }, // No need for ownerId here as findOne already checked ownership
      data: updateContactDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Ensure ownership and existence
    return this.prisma.contact.delete({
      where: { id },
    });
  }

  async removeAllForUser(userId: string): Promise<{ count: number }> {
    this.logger.log(`Attempting to delete all contacts for user ID: ${userId}`);
    const result = await this.prisma.contact.deleteMany({
      where: {
        ownerId: userId,
      },
    });
    this.logger.log(`Deleted ${result.count} contacts for user ID: ${userId}`);
    return result; // result is an object like { count: numberOfDeletedRecords }
  }

  async findAll(userId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: { ownerId: userId },
      include: {
        transactions: {
          // Include transactions to calculate balance
          select: {
            amount: true,
            type: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate netBalance for each contact
    return contacts.map((contact) => {
      let netBalance = new Prisma.Decimal(0);
      contact.transactions.forEach((transaction) => {
        if (transaction.type === 'GAVE') {
          // You gave money to contact, they owe you
          netBalance = netBalance.plus(transaction.amount);
        } else if (transaction.type === 'GOT') {
          // You got money from contact, they paid you / you owe them less
          netBalance = netBalance.minus(transaction.amount);
        }
      });
      // Remove transactions from the returned object if not needed directly by the list view
      // Or create a DTO for the response
      const { transactions, ...contactWithoutTransactions } = contact;
      return {
        ...contactWithoutTransactions,
        netBalance: netBalance.toNumber(), // Convert Decimal to number for JSON response
      };
    });
  }

  async findOne(id: string, userId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        transactions: true, // Include all transaction details for the detail view
      },
    });

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    if (contact.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this contact',
      );
    }

    let netBalance = new Prisma.Decimal(0);
    contact.transactions.forEach((transaction) => {
      if (transaction.type === 'GAVE') {
        netBalance = netBalance.plus(transaction.amount);
      } else if (transaction.type === 'GOT') {
        netBalance = netBalance.minus(transaction.amount);
      }
    });

    // For findOne, you might want to return transactions if it's for a detail page
    return {
      ...contact,
      netBalance: netBalance.toNumber(),
    };
  }

  async importFromCsv(
    csvString: string,
    userId: string,
  ): Promise<{
    importedCount: number;
    skippedCount: number;
    errors: string[];
  }> {
    this.logger.log(`Starting CSV import for user: ${userId}`);
    if (typeof Papa === 'undefined' || typeof Papa.parse !== 'function') {
      this.logger.error(
        'PapaParse library (Papa.parse) is not correctly loaded/initialized.',
      );
      throw new InternalServerErrorException(
        'CSV parsing library not available.',
      );
    }

    return new Promise((resolve, reject) => {
      let importedCount = 0;
      let skippedCount = 0;
      const importErrors: string[] = [];

      Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (header: string) => header.trim(),
        complete: async (results: Papa.ParseResult<GoogleCsvRow>) => {
          this.logger.log(
            `CSV parsing completed. Rows found: ${results.data.length}`,
          );
          if (results.errors.length > 0) {
            results.errors.forEach((err) => {
              const errorMessage = `CSV Parsing Error: ${err.message} on row ${err.row || 'unknown'}. Code: ${err.code}, Type: ${err.type}`;
              this.logger.warn(errorMessage);
              importErrors.push(errorMessage);
            });
          }

          const contactsToCreate: Prisma.ContactCreateManyInput[] = [];
          const existingUserContacts = await this.prisma.contact.findMany({
            where: { ownerId: userId },
            select: { email: true, phone: true, name: true },
          });
          const addedInThisBatch = new Set<string>(); // To track email/phone added in this CSV import run

          for (const [index, row] of results.data.entries()) {
            // 1. Determine the Name
            let contactName = row['Name']?.trim();
            if (!contactName) {
              const firstName = row['First Name']?.trim() || '';
              const given = row['Given Name']?.trim() || '';
              const middle = row['Middle Name']?.trim() || '';
              const family = row['Family Name']?.trim() || '';
              contactName = `${firstName} ${given} ${middle} ${family}`
                .replace(/\s+/g, ' ')
                .trim();
            }
            if (!contactName && row['Nickname']?.trim()) {
              // Fallback to Nickname
              contactName = row['Nickname']?.trim();
            }

            // 2. Determine Email (prioritize, then take first available)
            let contactEmail: string | undefined = undefined;
            const emailFieldsToTry = [
              'E-mail 1 - Value',
              'E-mail 2 - Value',
              'E-mail 3 - Value',
            ];
            for (const field of emailFieldsToTry) {
              if (row[field]?.trim()) {
                contactEmail = row[field].trim();
                break;
              }
            }

            // 3. Determine Phone (prioritize mobile, then take first available)
            let contactPhone: string | undefined = undefined;
            const phoneEntries: { type?: string; value?: string }[] = [];
            for (let i = 1; i <= 5; i++) {
              // Check up to 5 phone numbers
              if (row[`Phone ${i} - Value`]) {
                phoneEntries.push({
                  type: row[`Phone ${i} - Type`],
                  value: row[`Phone ${i} - Value`]?.trim(),
                });
              }
            }

            if (phoneEntries.length > 0) {
              // Prioritize "Mobile" type
              const mobilePhone = phoneEntries.find(
                (p) => p.type?.toLowerCase() === 'mobile' && p.value,
              );
              if (mobilePhone) {
                contactPhone = mobilePhone.value;
              } else {
                // Take the first available phone number if no mobile is found
                contactPhone = phoneEntries.find((p) => p.value)?.value;
              }
            }

            // 4. Skip if essential data is missing
            if (!contactName || (!contactEmail && !contactPhone)) {
              skippedCount++;
              const skipMsg = `Skipped row ${index + 2}: Missing name, or missing both email and phone. Name: '${contactName}', Email: '${contactEmail}', Phone: '${contactPhone}'`;
              this.logger.warn(skipMsg);
              importErrors.push(skipMsg);
              continue;
            }

            // 5. Duplicate Check (more robust)
            let isDuplicate = false;
            const emailLower = contactEmail?.toLowerCase();

            // Check against DB
            if (
              emailLower &&
              existingUserContacts.some(
                (c) => c.email?.toLowerCase() === emailLower,
              )
            )
              isDuplicate = true;
            if (
              !isDuplicate &&
              contactPhone &&
              existingUserContacts.some(
                (c) =>
                  this.normalizePhone(c.phone) ===
                  this.normalizePhone(contactPhone),
              )
            )
              isDuplicate = true;

            // Check against what's already been added in this batch
            if (
              !isDuplicate &&
              emailLower &&
              addedInThisBatch.has(`email:${emailLower}`)
            )
              isDuplicate = true;
            if (
              !isDuplicate &&
              contactPhone &&
              addedInThisBatch.has(`phone:${this.normalizePhone(contactPhone)}`)
            )
              isDuplicate = true;

            if (isDuplicate) {
              skippedCount++;
              const dupMsg = `Skipped duplicate: ${contactName} (Email: ${contactEmail}, Phone: ${contactPhone})`;
              this.logger.warn(dupMsg);
              importErrors.push(dupMsg);
              continue;
            }

            // Add to batch and mark as added for this run
            if (emailLower) addedInThisBatch.add(`email:${emailLower}`);
            if (contactPhone)
              addedInThisBatch.add(
                `phone:${this.normalizePhone(contactPhone)}`,
              );

            contactsToCreate.push({
              name: contactName,
              email: contactEmail || null,
              phone: contactPhone || null,
              ownerId: userId,
            });
          }

          if (contactsToCreate.length > 0) {
            this.logger.log(
              `Attempting to create ${contactsToCreate.length} new contacts.`,
            );
            try {
              const result = await this.prisma.contact.createMany({
                data: contactsToCreate,
                skipDuplicates: true, // Prisma uses @@unique constraints for this
              });
              importedCount = result.count;
              this.logger.log(
                `${importedCount} contacts created successfully via createMany.`,
              );
            } catch (e: any) {
              this.logger.error(
                'Error during batch contact creation:',
                e.stack,
              );
              importErrors.push(
                `Database error during batch import: ${e.message}`,
              );
            }
          }
          this.logger.log(
            `Import finished. Imported: ${importedCount}, Skipped: ${skippedCount}, Errors: ${importErrors.length}`,
          );
          resolve({ importedCount, skippedCount, errors: importErrors });
        },
        error: (error: Error) => {
          const errMsg = `PapaParse streaming error: ${error.message}`;
          this.logger.error(errMsg, error.stack);
          reject(new BadRequestException(errMsg));
        },
      });
    });
  }

  // Helper function to normalize phone numbers for comparison
  private normalizePhone(phone?: string | null): string | undefined {
    if (!phone) return undefined;
    return phone.replace(/\D/g, ''); // Remove all non-digit characters
  }
}
