import { Migration } from '@mikro-orm/migrations';

export class Migration20251002223000_AdminRolesPermissions extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table \`admin_roles\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`name\` varchar(255) not null, \`description\` varchar(255) null, \`is_system\` tinyint(1) not null default false, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`create unique index \`admin_roles_name_unique\` on \`admin_roles\` (\`name\`);`);

    this.addSql(`create table \`admin_permissions\` (\`uuid\` varchar(255) not null, \`created_at\` datetime not null default CURRENT_TIMESTAMP, \`updated_at\` datetime not null default CURRENT_TIMESTAMP, \`deleted_at\` datetime null, \`code\` varchar(255) not null, \`name\` varchar(255) not null, \`module\` varchar(255) not null, \`description\` varchar(255) null, \`is_module_permission\` tinyint(1) not null default false, \`display_order\` int null, primary key (\`uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`create unique index \`admin_permissions_code_unique\` on \`admin_permissions\` (\`code\`);`);

    this.addSql(`create table \`admin_role_permissions\` (\`role_uuid\` varchar(255) not null, \`permission_uuid\` varchar(255) not null, primary key (\`role_uuid\`, \`permission_uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`create index \`admin_role_permissions_role_uuid_index\` on \`admin_role_permissions\` (\`role_uuid\`);`);
    this.addSql(`create index \`admin_role_permissions_permission_uuid_index\` on \`admin_role_permissions\` (\`permission_uuid\`);`);

    this.addSql(`create table \`admin_user_roles\` (\`admin_user_uuid\` varchar(255) not null, \`role_uuid\` varchar(255) not null, primary key (\`admin_user_uuid\`, \`role_uuid\`)) default character set utf8mb4 engine = InnoDB;`);
    this.addSql(`create index \`admin_user_roles_admin_user_uuid_index\` on \`admin_user_roles\` (\`admin_user_uuid\`);`);
    this.addSql(`create index \`admin_user_roles_role_uuid_index\` on \`admin_user_roles\` (\`role_uuid\`);`);

    this.addSql(`alter table \`admin_role_permissions\` add constraint \`admin_role_permissions_role_uuid_foreign\` foreign key (\`role_uuid\`) references \`admin_roles\` (\`uuid\`) on update cascade on delete cascade;`);
    this.addSql(`alter table \`admin_role_permissions\` add constraint \`admin_role_permissions_permission_uuid_foreign\` foreign key (\`permission_uuid\`) references \`admin_permissions\` (\`uuid\`) on update cascade on delete cascade;`);

    this.addSql(`alter table \`admin_user_roles\` add constraint \`admin_user_roles_admin_user_uuid_foreign\` foreign key (\`admin_user_uuid\`) references \`admin_users\` (\`uuid\`) on update cascade on delete cascade;`);
    this.addSql(`alter table \`admin_user_roles\` add constraint \`admin_user_roles_role_uuid_foreign\` foreign key (\`role_uuid\`) references \`admin_roles\` (\`uuid\`) on update cascade on delete cascade;`);

    this.addSql(`insert into \`admin_permissions\` (\`uuid\`, \`created_at\`, \`updated_at\`, \`code\`, \`name\`, \`module\`, \`description\`, \`is_module_permission\`, \`display_order\`) values
    ('43d83c82-8aed-4548-85f2-75c82899ce77', now(), now(), 'dashboard.view', 'Dashboard', 'dashboard', null, true, 1),
    ('3ab02617-622f-4182-8c15-be13582f61f2', now(), now(), 'users.view', 'Users', 'users', null, true, 2),
    ('b45d9be5-e251-42c5-9319-cd7f3251aecb', now(), now(), 'users.suspend', 'Permission to Suspend/Unsuspend user', 'users', null, false, 3),
    ('f443d630-6684-4ca9-a8a3-6caa45164bad', now(), now(), 'providers.view', 'Service providers', 'providers', null, true, 4),
    ('76f6c5cc-4618-40dd-b7b5-e6715a4bb219', now(), now(), 'providers.suspend', 'Permission to Suspend/Unsuspend providers', 'providers', null, false, 5),
    ('5419c840-499b-44d9-b8da-e7e5b1b50a18', now(), now(), 'jobs.view', 'Jobs', 'jobs', null, true, 6),
    ('445287b4-f8f8-48c7-a691-260843b92947', now(), now(), 'disputes.view', 'Disputes', 'disputes', null, true, 7),
    ('78cae4de-1212-4b92-bfb4-52320da30468', now(), now(), 'disputes.resolve', 'Permission to resolve disputes', 'disputes', null, false, 8),
    ('bbbaa848-7f20-4b9f-96ca-d8bddae567e9', now(), now(), 'reports.view', 'Reports', 'reports', null, true, 9),
    ('f00976d0-7a55-4db0-bd9d-75efe7d21aeb', now(), now(), 'reports.resolve', 'Permission to resolve reports', 'reports', null, false, 10),
    ('3c9cb5ed-8ba6-4ce8-a6e0-d381a9e39ee4', now(), now(), 'feedback.view', 'Feedback', 'feedback', null, true, 11),
    ('a63f9e54-215c-4e53-8dc0-4d090842e29a', now(), now(), 'team_members.view', 'Team members', 'team_members', null, true, 12),
    ('0f359544-1cb8-47bd-8145-6f3677481e61', now(), now(), 'team_members.manage_members', 'Permission to add/remove team members', 'team_members', null, false, 13),
    ('2c68c341-9b8d-4949-b78d-19a48a006ddf', now(), now(), 'team_members.edit_member_role', 'Permission to edit team member role', 'team_members', null, false, 14),
    ('305e5bf9-32f4-4c65-b4e5-b5e7cd0329e2', now(), now(), 'team_members.manage_roles', 'Permission to add/remove roles', 'team_members', null, false, 15),
    ('ac43c4fe-9715-4a4f-ba02-44f89e69e20c', now(), now(), 'team_members.edit_roles', 'Permission to edit roles', 'team_members', null, false, 16),
    ('921fe145-967d-4be3-832f-b619489c8e8c', now(), now(), 'settings.view', 'Settings', 'settings', null, true, 17);`);

    this.addSql(`insert into \`admin_roles\` (\`uuid\`, \`created_at\`, \`updated_at\`, \`name\`, \`description\`, \`is_system\`) values ('81628169-a42a-479f-a429-4c0a03a9b8be', now(), now(), 'Super Admin', 'Full access to all administrative features', true);`);

    this.addSql(`insert into \`admin_role_permissions\` (\`role_uuid\`, \`permission_uuid\`) values
    ('81628169-a42a-479f-a429-4c0a03a9b8be', '43d83c82-8aed-4548-85f2-75c82899ce77'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', '3ab02617-622f-4182-8c15-be13582f61f2'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', 'b45d9be5-e251-42c5-9319-cd7f3251aecb'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', 'f443d630-6684-4ca9-a8a3-6caa45164bad'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', '76f6c5cc-4618-40dd-b7b5-e6715a4bb219'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', '5419c840-499b-44d9-b8da-e7e5b1b50a18'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', '445287b4-f8f8-48c7-a691-260843b92947'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', '78cae4de-1212-4b92-bfb4-52320da30468'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', 'bbbaa848-7f20-4b9f-96ca-d8bddae567e9'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', 'f00976d0-7a55-4db0-bd9d-75efe7d21aeb'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', '3c9cb5ed-8ba6-4ce8-a6e0-d381a9e39ee4'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', 'a63f9e54-215c-4e53-8dc0-4d090842e29a'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', '0f359544-1cb8-47bd-8145-6f3677481e61'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', '2c68c341-9b8d-4949-b78d-19a48a006ddf'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', '305e5bf9-32f4-4c65-b4e5-b5e7cd0329e2'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', 'ac43c4fe-9715-4a4f-ba02-44f89e69e20c'),
    ('81628169-a42a-479f-a429-4c0a03a9b8be', '921fe145-967d-4be3-832f-b619489c8e8c');`);

    this.addSql(`insert into \`admin_user_roles\` (\`admin_user_uuid\`, \`role_uuid\`) select \`uuid\`, '81628169-a42a-479f-a429-4c0a03a9b8be' from \`admin_users\`;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists \`admin_user_roles\`;`);
    this.addSql(`drop table if exists \`admin_role_permissions\`;`);
    this.addSql(`drop table if exists \`admin_permissions\`;`);
    this.addSql(`drop table if exists \`admin_roles\`;`);
  }

}
