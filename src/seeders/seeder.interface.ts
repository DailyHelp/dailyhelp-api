export interface ISeeder {
  run(): Promise<any>;
}

export interface ISeederConstructor {
  new (...args): ISeeder;
}
