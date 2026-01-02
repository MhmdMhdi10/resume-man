"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTemplate = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
class BaseTemplate {
    constructor() {
        this.margin = 50;
        this.pageWidth = 612;
        this.pageHeight = 792;
        this.doc = new pdfkit_1.default({
            size: 'LETTER',
            margins: { top: this.margin, bottom: this.margin, left: this.margin, right: this.margin },
        });
        this.contentWidth = this.pageWidth - 2 * this.margin;
        this.colors = this.getDefaultColors();
        this.fonts = this.getDefaultFonts();
    }
    async toBuffer() {
        return new Promise((resolve, reject) => {
            const chunks = [];
            this.doc.on('data', (chunk) => chunks.push(chunk));
            this.doc.on('end', () => resolve(Buffer.concat(chunks)));
            this.doc.on('error', reject);
            this.doc.end();
        });
    }
    formatDate(date) {
        if (!date)
            return 'Present';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    formatDateRange(startDate, endDate, current) {
        const start = this.formatDate(startDate);
        const end = current ? 'Present' : this.formatDate(endDate);
        return `${start} - ${end}`;
    }
    filterExperiences(experiences, selectedIds) {
        if (!selectedIds || selectedIds.length === 0)
            return experiences;
        return experiences.filter((exp) => selectedIds.includes(exp.id));
    }
    filterEducation(education, selectedIds) {
        if (!selectedIds || selectedIds.length === 0)
            return education;
        return education.filter((edu) => selectedIds.includes(edu.id));
    }
    filterSkills(skills, selectedIds) {
        if (!selectedIds || selectedIds.length === 0)
            return skills;
        return skills.filter((skill) => selectedIds.includes(skill.id));
    }
    checkPageBreak(requiredSpace) {
        if (this.doc.y + requiredSpace > this.pageHeight - this.margin) {
            this.doc.addPage();
        }
    }
}
exports.BaseTemplate = BaseTemplate;
//# sourceMappingURL=base.template.js.map