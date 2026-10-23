import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  create(dto: CreateCompanyDto, owner: User) {
    const company = this.companyRepository.create({
      name: dto.name,
      address: dto.address,
      owner,
      adminUsers: [owner],
    });
    return this.companyRepository.save(company);
  }

  findAllForUser(user: User) {
    return this.companyRepository.find({
      where: { owner: { id: user.id } },
    });
  }

  // Not ownership-scoped; superadmin platform-wide listing.
  findAllCompanies() {
    return this.companyRepository.find();
  }

  // Not ownership-scoped; used by internal services (scheduler, worker).
  async findById(id: string) {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async findOneForUser(id: string, user: User) {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    this.assertOwnership(company, user);
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, user: User) {
    const company = await this.findOneForUser(id, user);
    Object.assign(company, dto);
    return this.companyRepository.save(company);
  }

  async remove(id: string, user: User) {
    const company = await this.findOneForUser(id, user);
    await this.companyRepository.remove(company);
    return { deleted: true };
  }

  private assertOwnership(company: Company, user: User) {
    if (company.owner?.id !== user.id) {
      throw new ForbiddenException('You do not have access to this company');
    }
  }
}
