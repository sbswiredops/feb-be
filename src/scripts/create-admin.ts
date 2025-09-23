import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';

async function createAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

  const email = process.argv[2] || 'admin@example.com';
  const password = process.argv[3] || 'admin123';

  // Check if admin already exists
  const existingAdmin = await userRepository.findOne({ where: { email } });
  if (existingAdmin) {
    console.log(`Admin with email ${email} already exists`);
    await app.close();
    return;
  }

  // Create new admin
  const hashedPassword = bcrypt.hashSync(password, 10);
  const admin = userRepository.create({
    email,
    password_hash: hashedPassword,
    role: 'admin',
  });

  await userRepository.save(admin);
  console.log(`Admin created successfully:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Please change the password after first login!`);

  await app.close();
}

createAdmin().catch(console.error);