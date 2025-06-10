import { Injectable } from '@nestjs/common';
import { ISeeder } from '../seeder.interface';
import { EntityManager } from '@mikro-orm/core';
import { MainCategory, SubCategory } from '../../modules/admin/admin.entities';
import { v4 } from 'uuid';

@Injectable()
export default class SubCategorySeed implements ISeeder {
  constructor(private readonly em: EntityManager) {}

  async run(): Promise<void> {
    const forkedEm = this.em.fork();
    const mainCategories = await forkedEm.findAll(MainCategory);
    if (!mainCategories.length) return;
    const existingSubCategories = await forkedEm.findAll(SubCategory);
    if (existingSubCategories.length) return;
    const subCategories = [
      { name: 'Apartment Cleaning', main: 'Home & Cleaning' },
      { name: 'Upholstery Cleaning', main: 'Home & Cleaning' },
      { name: 'After Builders Cleaning', main: 'Home & Cleaning' },
      { name: 'Window Blind Cleaning', main: 'Home & Cleaning' },
      { name: 'Ceiling Cleaning', main: 'Home & Cleaning' },
      { name: 'Airbnb Cleaning', main: 'Home & Cleaning' },
      { name: 'Mould Removal', main: 'Home & Cleaning' },
      { name: 'Office Cleaning', main: 'Home & Cleaning' },
      { name: 'Move In Cleaning', main: 'Home & Cleaning' },
      { name: 'Commercial Kitchen Cleaning', main: 'Home & Cleaning' },
      { name: 'House Painters', main: 'Home & Cleaning' },
      { name: 'Home Organizer', main: 'Home & Cleaning' },
      { name: 'Curtains & Blind Fitters', main: 'Home & Cleaning' },
      { name: 'Apartment Painting', main: 'Home & Cleaning' },
      { name: 'Commercial Painting', main: 'Home & Cleaning' },
      { name: 'Ceiling Installation', main: 'Home & Cleaning' },
      { name: 'Pest Control', main: 'Home & Cleaning' },
      { name: 'Roof Cleaning & Repair', main: 'Home & Cleaning' },
      { name: 'Applicance Installation', main: 'Repairs & Maintenance' },
      { name: 'Appliance Repair', main: 'Repairs & Maintenance' },
      { name: 'Home Renovation', main: 'Repairs & Maintenance' },
      { name: 'Building Contractor', main: 'Repairs & Maintenance' },
      {
        name: 'Swimming Pool Construction and Maintenance',
        main: 'Repairs & Maintenance',
      },
      { name: 'Panel Beater', main: 'Repairs & Maintenance' },
      { name: 'Carpentry & Furniture', main: 'Repairs & Maintenance' },
      { name: 'Electrician', main: 'Repairs & Maintenance' },
      {
        name: 'Solar Panel Installation Technician',
        main: 'Repairs & Maintenance',
      },
      { name: 'Plumber', main: 'Repairs & Maintenance' },
      { name: 'Roof Maintenance Technician', main: 'Repairs & Maintenance' },
      { name: 'Roof Installation & Removal', main: 'Repairs & Maintenance' },
      { name: 'Tiler', main: 'Repairs & Maintenance' },
      {
        name: 'Cable TV / Satellite Installation/Maintenance',
        main: 'Repairs & Maintenance',
      },
      {
        name: 'Wifi Installation',
        main: 'Repairs & Maintenance',
      },
      {
        name: 'Fire Alarm Installation',
        main: 'Repairs & Maintenance',
      },
      {
        name: 'CCTV Installation Technician',
        main: 'Repairs & Maintenance',
      },
      {
        name: 'Heavy Lifting',
        main: 'Repairs & Maintenance',
      },
      {
        name: 'Baker (Cake and Pastry)',
        main: 'Food & Kitchen',
      },
      {
        name: 'Party Catering',
        main: 'Food & Kitchen',
      },
      {
        name: 'Catering Assistant',
        main: 'Food & Kitchen',
      },
      {
        name: 'Cook',
        main: 'Food & Kitchen',
      },
      { name: 'Chef', main: 'Food & Kitchen' },
      { name: 'Grocery Shopper', main: 'Food & Kitchen' },
      { name: 'Nanny', main: 'Family & Personal Care' },
      { name: 'Licensed Private Tutor', main: 'Family & Personal Care' },
      { name: 'After School Pick Up & Care', main: 'Family & Personal Care' },
      { name: 'Nurse', main: 'Family & Personal Care' },
      { name: 'Carer', main: 'Family & Personal Care' },
      { name: 'Baby Sitters', main: 'Family & Personal Care' },
      { name: 'Personal Assistant', main: 'Family & Personal Care' },
      { name: 'Research Assistant', main: 'Family & Personal Care' },
      { name: 'Virtual Assistant', main: 'Family & Personal Care' },
      { name: 'Karate Lessons', main: 'Family & Personal Care' },
      { name: 'Pottery Lessons', main: 'Family & Personal Care' },
      { name: 'Swimming Teacher', main: 'Family & Personal Care' },
      { name: 'Mobile Hair Braiders', main: 'Family & Personal Care' },
      { name: 'Haircut & Trimming', main: 'Family & Personal Care' },
      { name: 'Nail Technician', main: 'Family & Personal Care' },
      { name: 'Mobile Makeup Artist', main: 'Family & Personal Care' },
      { name: 'Personal Shopper', main: 'Family & Personal Care' },
      { name: 'Package Pickup & Delivery', main: 'Transport & Delivery' },
      { name: 'Car Rental', main: 'Transport & Delivery' },
      { name: 'Vehicle Hire', main: 'Transport & Delivery' },
      { name: 'Movers', main: 'Transport & Delivery' },
      { name: 'Freelance Blog Writing', main: 'Tech & Digital Help' },
      { name: 'Freelance Content Creation', main: 'Tech & Digital Help' },
      { name: 'Freelance Creative Writer', main: 'Tech & Digital Help' },
      { name: 'Freelance Case Study Writing', main: 'Tech & Digital Help' },
      { name: 'Freelance Copywriting', main: 'Tech & Digital Help' },
      { name: 'Freelance Ghostwriting', main: 'Tech & Digital Help' },
      { name: 'Freelance Embroidery Service', main: 'Skilled Labor' },
      { name: 'Pattern Cutter', main: 'Skilled Labor' },
      { name: 'Beaders', main: 'Skilled Labor' },
      { name: 'Freelance Tailor', main: 'Skilled Labor' },
      { name: 'Photography Assistant', main: 'Skilled Labor' },
      { name: 'Freelance Photographer / Editor', main: 'Skilled Labor' },
      { name: 'Auto Electrical Engineers', main: 'Skilled Labor' },
      { name: 'Auto Mechanical Engineers', main: 'Skilled Labor' },
      { name: 'Auto AC Repair Specialist', main: 'Skilled Labor' },
      { name: 'Dash Cam Installation Technician', main: 'Skilled Labor' },
      { name: 'Car Tracker Installation Technician', main: 'Skilled Labor' },
      {
        name: 'Architectural Rendering & Building Design Visualization',
        main: 'Skilled Labor',
      },
      { name: 'Interior Architect', main: 'Skilled Labor' },
      { name: 'Boxing Lesson', main: 'Skilled Labor' },
      { name: 'Portrait Painting', main: 'Skilled Labor' },
      { name: 'Event Planner', main: 'Events & Setup' },
      { name: 'Event Decorator', main: 'Events & Setup' },
      { name: 'Party Helpers', main: 'Events & Setup' },
      { name: 'Event Security / Bouncers', main: 'Events & Setup' },
      { name: 'Auto Electrical Engineers', main: 'Automobile Services' },
      { name: 'Auto Mechanical Engineers', main: 'Automobile Services' },
      { name: 'Auto AC Repair Specialist', main: 'Automobile Services' },
      { name: 'Dash Cam Installation Technician', main: 'Automobile Services' },
      {
        name: 'Car Tracker Installation Technician',
        main: 'Automobile Services',
      },
      { name: 'Panel Beater', main: 'Automobile Services' },
    ];
    const mapped = subCategories.map((sc) => {
      const parent = mainCategories.find((mc) => mc.name === sc.main);
      return forkedEm.create(SubCategory, {
        uuid: v4(),
        name: sc.name,
        mainCategory: forkedEm.getReference(MainCategory, parent.uuid),
      });
    });
    await forkedEm.persistAndFlush(mapped);
    console.log('Subcategories seeded');
  }
}
