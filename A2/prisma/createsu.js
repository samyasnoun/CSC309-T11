/*
 * Complete this script so that it is able to add a superuser to the database
 * Usage example: 
 *   node prisma/createsu.js clive123 clive.su@mail.utoronto.ca SuperUser123!
 */
'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Validation functions
function validateUtorid(utorid) {
  if (!utorid || typeof utorid !== 'string') {
    throw new Error('Utorid is required');
  }
  
  if (utorid.length < 7 || utorid.length > 8) {
    throw new Error('Utorid must be 7-8 characters long');
  }
  
  if (!/^[a-zA-Z0-9]+$/.test(utorid)) {
    throw new Error('Utorid must contain only alphanumeric characters');
  }
  
  return true;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required');
  }
  
  // Check for UofT email domain
  const uoftDomains = [
    'mail.utoronto.ca',
    'utoronto.ca',
    'student.utoronto.ca'
  ];
  
  const emailDomain = email.split('@')[1];
  if (!emailDomain || !uoftDomains.includes(emailDomain)) {
    throw new Error('Email must be from a UofT domain (@mail.utoronto.ca, @utoronto.ca, or @student.utoronto.ca)');
  }
  
  return true;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }
  
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  return true;
}

async function createSuperUser(utorid, email, password) {
  try {
    // Validate inputs
    validateUtorid(utorid);
    validateEmail(email);
    validatePassword(password);
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { utorid: utorid },
          { email: email }
        ]
      }
    });
    
    if (existingUser) {
      console.log(`User with utorid '${utorid}' or email '${email}' already exists`);
      process.exit(0);
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create superuser with activation token
    const activationData = {
      token: require('uuid').v4(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };
    
    const superUser = await prisma.user.create({
      data: {
        utorid: utorid,
        name: `Super User ${utorid}`, // Sensible default name
        email: email,
        role: 'superuser',
        verified: true,
        activated: true,
        points: 0,
        suspicious: false,
        passwordHash: passwordHash, // Store hashed password
        activationToken: activationData.token,
        activationExpires: activationData.expiresAt,
        createdAt: new Date()
      }
    });
    
    console.log(`Superuser created successfully:`);
    console.log(`  ID: ${superUser.id}`);
    console.log(`  Utorid: ${superUser.utorid}`);
    console.log(`  Email: ${superUser.email}`);
    console.log(`  Role: ${superUser.role}`);
    console.log(`  Verified: ${superUser.verified}`);
    console.log(`  Activated: ${superUser.activated}`);
    console.log(`  Activation Token: ${activationData.token}`);
    console.log(`  Token Expires: ${activationData.expiresAt.toISOString()}`);
    
  } catch (error) {
    console.error('Error creating superuser:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 3) {
    console.error('Usage: node prisma/createsu.js <utorid> <email> <password>');
    console.error('Example: node prisma/createsu.js clive123 clive.su@mail.utoronto.ca SuperUser123!');
    process.exit(1);
  }
  
  const [utorid, email, password] = args;
  
  await createSuperUser(utorid, email, password);
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { createSuperUser, validateUtorid, validateEmail, validatePassword };
