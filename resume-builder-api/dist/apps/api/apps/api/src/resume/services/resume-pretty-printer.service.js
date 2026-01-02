"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ResumePrettyPrinterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumePrettyPrinterService = void 0;
const common_1 = require("@nestjs/common");
const pdf_parse_1 = require("pdf-parse");
let ResumePrettyPrinterService = ResumePrettyPrinterService_1 = class ResumePrettyPrinterService {
    constructor() {
        this.logger = new common_1.Logger(ResumePrettyPrinterService_1.name);
        this.sectionPatterns = {
            summary: /(?:professional\s+)?summary|objective|profile/i,
            experience: /(?:work\s+)?experience|employment|professional\s+experience/i,
            education: /education|academic|qualifications/i,
            skills: /skills|competencies|expertise|technical\s+skills/i,
        };
    }
    async parseFromPdf(pdfBuffer) {
        this.logger.log(`Parsing PDF, size: ${pdfBuffer.length} bytes`);
        try {
            const parser = new pdf_parse_1.PDFParse({ data: pdfBuffer });
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
        }
        catch (error) {
            this.logger.error('Failed to parse PDF:', error);
            throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    extractSections(text) {
        const sections = [];
        const lines = text.split('\n').filter((line) => line.trim());
        let currentSection = null;
        let headerProcessed = false;
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine)
                continue;
            const sectionType = this.detectSectionType(trimmedLine);
            if (sectionType && sectionType !== 'unknown') {
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = { type: sectionType, content: '' };
            }
            else if (!headerProcessed && !currentSection) {
                sections.push({ type: 'header', content: trimmedLine });
                headerProcessed = true;
            }
            else if (currentSection) {
                currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
            }
        }
        if (currentSection) {
            sections.push(currentSection);
        }
        return sections;
    }
    detectSectionType(line) {
        const normalizedLine = line.toLowerCase().trim();
        for (const [type, pattern] of Object.entries(this.sectionPatterns)) {
            if (pattern.test(normalizedLine) && normalizedLine.length < 50) {
                return type;
            }
        }
        return null;
    }
    async extractTextContent(pdfBuffer) {
        const parser = new pdf_parse_1.PDFParse({ data: pdfBuffer });
        const result = await parser.getText();
        await parser.destroy();
        return result.text;
    }
    async containsText(pdfBuffer, searchText) {
        const text = await this.extractTextContent(pdfBuffer);
        return text.toLowerCase().includes(searchText.toLowerCase());
    }
    async containsAllTexts(pdfBuffer, searchTexts) {
        const text = await this.extractTextContent(pdfBuffer);
        const lowerText = text.toLowerCase();
        return searchTexts.every((search) => lowerText.includes(search.toLowerCase()));
    }
};
exports.ResumePrettyPrinterService = ResumePrettyPrinterService;
exports.ResumePrettyPrinterService = ResumePrettyPrinterService = ResumePrettyPrinterService_1 = __decorate([
    (0, common_1.Injectable)()
], ResumePrettyPrinterService);
//# sourceMappingURL=resume-pretty-printer.service.js.map