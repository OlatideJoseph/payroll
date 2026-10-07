export class CreateCompanyDto {
  name: string;
  address: string;
  users: string[]; // Array of user IDs
  adminUsers: string[]; // Array of admin user IDs
}
