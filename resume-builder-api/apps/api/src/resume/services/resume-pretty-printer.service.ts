import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

export interface ParsedResumeData {
  text: string;
  pages: number;
  info: {
    title?: string;
    author?: string;
    creator?: string;
    creationDate?: Date;
  };
  sections: ParsedSection[];
}

export interface ParsedSection {
  type: 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'unknown';
  content: string;
}

@Injectable()
export class ResumePrettyPrinterService {
  private readonly logger = new Logger(ResumePrettyPrinterService.name);

  private readonly sectionPatterns: Record<string, RegExp> = {
    summary: /(?:professional\s+)?summary|objective|profile/i,
    experience: /(?:work\s+)?experience|employment|professional\s+experience/i,
    education: /education|academic|qualifications/i,
    skills: /skills|competencies|expertise|technical\s+skills/i,
  };

  async parseFromPdf(pdfBuffer: Buffer): Promise<ParsedResumeData> {
    this.logger.log(`Parsing PDF, size: ${pdfBuffer.length} bytes`);

    try {
      const parser = new PDFParse({ data: pdfBuffer });
      const textResult = await parser.getText();
      const infoResult = await parser.getInfo();
      await parser.destroy();

      const sections = this.extractSections(textResult.text);

      return {
        text: textResult.text,
        pages: textResult.total,
        info: {
          title: infoResult.info?.Title,
          author: infoResult.info?.Author,
          creator: infoResult.info?.Creator,
          creationDate: infoResult.info?.CreationDate ? new Date(infoResult.info.CreationDate) : undefined,
        },
        sections,
      };
    } catch (error) {
      this.logger.error('Failed to parse PDF:', error);
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractSections(text: string): ParsedSection[] {
    const sections: ParsedSection[] = [];
    const lines = text.split('\n').filter((line) => line.trim());

    let currentSection: ParsedSection | null = null;
    let headerProcessed = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const sectionType = this.detectSectionType(trimmedLine);

      if (sectionType && sectionType !== 'unknown') {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { type: sectionType, content: '' };
      } else if (!headerProcessed && !currentSection) {
        // First content is likely the header
        sections.push({ type: 'header', content: trimmedLine });
        headerProcessed = true;
      } else if (currentSection) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
      }
    }

    // Don't forget the last section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  private detectSectionType(line: string): ParsedSection['type'] | null {
    const normalizedLine = line.toLowerCase().trim();

    for (const [type, pattern] of Object.entries(this.sectionPatterns)) {
      if (pattern.test(normalizedLine) && normalizedLine.length < 50) {
        return type as ParsedSection['type'];
      }
    }

    return null;
  }

  async extractTextContent(pdfBuffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  async containsText(pdfBuffer: Buffer, searchText: string): Promise<boolean> {
    const text = await this.extractTextContent(pdfBuffer);
    return text.toLowerCase().includes(searchText.toLowerCase());
  }

  async containsAllTexts(pdfBuffer: Buffer, searchTexts: string[]): Promise<boolean> {
    const text = await this.extractTextContent(pdfBuffer);
    const lowerText = text.toLowerCase();
    return searchTexts.every((search) => lowerText.includes(search.toLowerCase()));
  }
}
