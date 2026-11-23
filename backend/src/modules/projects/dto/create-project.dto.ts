import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  projectType!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(160)
  projectName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(12000)
  description!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @Matches(/^https?:\/\/\S+$/, {
    message: "projectLink must be a valid HTTP(S) URL.",
  })
  projectLink!: string;

  @IsArray()
  @ArrayMaxSize(1)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  @Matches(/^(?:\/(?!\/)\S*|https?:\/\/\S+)$/, {
    each: true,
    message: "Each image must be a local path or an HTTP(S) URL.",
  })
  images!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(/^(?:\/(?!\/)\S*|https?:\/\/\S+)?$/, {
    message: "backgroundImage must be a local path, an HTTP(S) URL, or empty.",
  })
  backgroundImage?: string | null;
}
