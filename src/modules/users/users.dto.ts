import { IsString } from "class-validator";

export class VerifyIdentityDto {
    @IsString()
    firstname: string;

    @IsString()
    middlename: string;
    
    @IsString()
    lastname: string;

    @IsString()
    dob: string;

    @IsString()
    gender: string;

    @IsString()
    nin: string;
    
    @IsString()
    bvn: string;

    @IsString()
    photo: string;
}
