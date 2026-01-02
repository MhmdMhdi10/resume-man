"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModernTemplate = void 0;
const base_template_1 = require("./base.template");
class ModernTemplate extends base_template_1.BaseTemplate {
    constructor() {
        super(...arguments);
        this.config = {
            id: 'modern',
            name: 'Modern',
            description: 'A clean, contemporary design with accent colors and clear section dividers',
            style: 'modern',
        };
    }
    getDefaultColors() {
        return {
            primary: '#2563eb',
            secondary: '#64748b',
            text: '#1e293b',
            accent: '#3b82f6',
            background: '#ffffff',
        };
    }
    getDefaultFonts() {
        return {
            heading: 'Helvetica-Bold',
            body: 'Helvetica',
        };
    }
    async generate(profile, sections, selectedExperiences, selectedEducation, selectedSkills) {
        if (sections.personalInfo) {
            this.renderHeader(profile);
        }
        if (sections.summary && profile.personalInfo.summary) {
            this.renderSummary(profile.personalInfo.summary);
        }
        if (sections.workExperience && profile.workExperience.length > 0) {
            const experiences = this.filterExperiences(profile.workExperience, selectedExperiences);
            if (experiences.length > 0) {
                this.renderExperience(experiences);
            }
        }
        if (sections.education && profile.education.length > 0) {
            const education = this.filterEducation(profile.education, selectedEducation);
            if (education.length > 0) {
                this.renderEducation(education);
            }
        }
        if (sections.skills && profile.skills.length > 0) {
            const skills = this.filterSkills(profile.skills, selectedSkills);
            if (skills.length > 0) {
                this.renderSkills(skills);
            }
        }
        return this.toBuffer();
    }
    renderHeader(profile) {
        const { personalInfo } = profile;
        const fullName = `${personalInfo.firstName} ${personalInfo.lastName}`;
        this.doc
            .font(this.fonts.heading)
            .fontSize(28)
            .fillColor(this.colors.primary)
            .text(fullName, this.margin, this.margin);
        const contactParts = [];
        if (personalInfo.email)
            contactParts.push(personalInfo.email);
        if (personalInfo.phone)
            contactParts.push(personalInfo.phone);
        if (personalInfo.address?.city) {
            const location = [personalInfo.address.city, personalInfo.address.country]
                .filter(Boolean)
                .join(', ');
            contactParts.push(location);
        }
        this.doc
            .font(this.fonts.body)
            .fontSize(10)
            .fillColor(this.colors.secondary)
            .text(contactParts.join(' | '), { align: 'left' });
        const links = [];
        if (personalInfo.linkedIn)
            links.push(personalInfo.linkedIn);
        if (personalInfo.website)
            links.push(personalInfo.website);
        if (links.length > 0) {
            this.doc.text(links.join(' | '), { align: 'left' });
        }
        this.doc.moveDown(1.5);
    }
    renderSectionHeader(title) {
        this.checkPageBreak(40);
        this.doc
            .font(this.fonts.heading)
            .fontSize(14)
            .fillColor(this.colors.primary)
            .text(title.toUpperCase());
        const y = this.doc.y + 2;
        this.doc
            .strokeColor(this.colors.accent)
            .lineWidth(2)
            .moveTo(this.margin, y)
            .lineTo(this.margin + this.contentWidth, y)
            .stroke();
        this.doc.moveDown(0.5);
    }
    renderSummary(summary) {
        this.renderSectionHeader('Professional Summary');
        this.doc
            .font(this.fonts.body)
            .fontSize(10)
            .fillColor(this.colors.text)
            .text(summary, { align: 'justify' });
        this.doc.moveDown(1);
    }
    renderExperience(experiences) {
        this.renderSectionHeader('Work Experience');
        experiences.forEach((exp, index) => {
            this.checkPageBreak(80);
            this.doc
                .font(this.fonts.heading)
                .fontSize(12)
                .fillColor(this.colors.text)
                .text(exp.role, { continued: true })
                .font(this.fonts.body)
                .fillColor(this.colors.secondary)
                .text(` at ${exp.company}`);
            this.doc
                .font(this.fonts.body)
                .fontSize(9)
                .fillColor(this.colors.secondary)
                .text(this.formatDateRange(exp.startDate, exp.endDate, exp.current));
            if (exp.description) {
                this.doc
                    .font(this.fonts.body)
                    .fontSize(10)
                    .fillColor(this.colors.text)
                    .text(exp.description, { align: 'justify' });
            }
            if (exp.achievements && exp.achievements.length > 0) {
                this.doc.moveDown(0.3);
                exp.achievements.forEach((achievement) => {
                    this.doc
                        .font(this.fonts.body)
                        .fontSize(10)
                        .fillColor(this.colors.text)
                        .text(`• ${achievement}`, { indent: 10 });
                });
            }
            if (index < experiences.length - 1) {
                this.doc.moveDown(0.8);
            }
        });
        this.doc.moveDown(1);
    }
    renderEducation(education) {
        this.renderSectionHeader('Education');
        education.forEach((edu, index) => {
            this.checkPageBreak(60);
            this.doc
                .font(this.fonts.heading)
                .fontSize(12)
                .fillColor(this.colors.text)
                .text(`${edu.degree} in ${edu.field}`);
            this.doc
                .font(this.fonts.body)
                .fontSize(10)
                .fillColor(this.colors.secondary)
                .text(edu.institution, { continued: true })
                .text(` | ${this.formatDateRange(edu.startDate, edu.endDate)}`);
            if (edu.gpa) {
                this.doc
                    .font(this.fonts.body)
                    .fontSize(9)
                    .fillColor(this.colors.secondary)
                    .text(`GPA: ${edu.gpa.toFixed(2)}`);
            }
            if (edu.achievements && edu.achievements.length > 0) {
                edu.achievements.forEach((achievement) => {
                    this.doc
                        .font(this.fonts.body)
                        .fontSize(10)
                        .fillColor(this.colors.text)
                        .text(`• ${achievement}`, { indent: 10 });
                });
            }
            if (index < education.length - 1) {
                this.doc.moveDown(0.6);
            }
        });
        this.doc.moveDown(1);
    }
    renderSkills(skills) {
        this.renderSectionHeader('Skills');
        const skillsByCategory = skills.reduce((acc, skill) => {
            const category = skill.category || 'other';
            if (!acc[category])
                acc[category] = [];
            acc[category].push(skill);
            return acc;
        }, {});
        Object.entries(skillsByCategory).forEach(([category, categorySkills]) => {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            const skillNames = categorySkills.map((s) => s.name).join(', ');
            this.doc
                .font(this.fonts.heading)
                .fontSize(10)
                .fillColor(this.colors.text)
                .text(`${categoryName}: `, { continued: true })
                .font(this.fonts.body)
                .fillColor(this.colors.secondary)
                .text(skillNames);
        });
    }
}
exports.ModernTemplate = ModernTemplate;
//# sourceMappingURL=modern.template.js.map