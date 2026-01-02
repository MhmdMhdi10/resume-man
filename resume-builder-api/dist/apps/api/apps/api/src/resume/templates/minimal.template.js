"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinimalTemplate = void 0;
const base_template_1 = require("./base.template");
class MinimalTemplate extends base_template_1.BaseTemplate {
    constructor() {
        super(...arguments);
        this.config = {
            id: 'minimal',
            name: 'Minimal',
            description: 'A simple, clean design focusing on content with minimal styling',
            style: 'minimal',
        };
    }
    getDefaultColors() {
        return {
            primary: '#333333',
            secondary: '#666666',
            text: '#333333',
            accent: '#999999',
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
            .fontSize(20)
            .fillColor(this.colors.primary)
            .text(fullName);
        this.doc.moveDown(0.3);
        const contactParts = [];
        if (personalInfo.email)
            contactParts.push(personalInfo.email);
        if (personalInfo.phone)
            contactParts.push(personalInfo.phone);
        if (personalInfo.address?.city) {
            contactParts.push(`${personalInfo.address.city}, ${personalInfo.address.country}`);
        }
        if (personalInfo.linkedIn)
            contactParts.push(personalInfo.linkedIn);
        if (personalInfo.website)
            contactParts.push(personalInfo.website);
        this.doc
            .font(this.fonts.body)
            .fontSize(9)
            .fillColor(this.colors.secondary)
            .text(contactParts.join(' | '));
        this.doc.moveDown(1.5);
    }
    renderSectionHeader(title) {
        this.checkPageBreak(30);
        this.doc
            .font(this.fonts.heading)
            .fontSize(11)
            .fillColor(this.colors.primary)
            .text(title);
        this.doc.moveDown(0.5);
    }
    renderSummary(summary) {
        this.renderSectionHeader('Summary');
        this.doc
            .font(this.fonts.body)
            .fontSize(10)
            .fillColor(this.colors.text)
            .text(summary);
        this.doc.moveDown(1);
    }
    renderExperience(experiences) {
        this.renderSectionHeader('Experience');
        experiences.forEach((exp, index) => {
            this.checkPageBreak(60);
            this.doc
                .font(this.fonts.heading)
                .fontSize(10)
                .fillColor(this.colors.primary)
                .text(`${exp.role} at ${exp.company}`, { continued: true })
                .font(this.fonts.body)
                .fontSize(9)
                .fillColor(this.colors.accent)
                .text(` | ${this.formatDateRange(exp.startDate, exp.endDate, exp.current)}`);
            if (exp.description) {
                this.doc
                    .font(this.fonts.body)
                    .fontSize(9)
                    .fillColor(this.colors.text)
                    .text(exp.description);
            }
            if (exp.achievements && exp.achievements.length > 0) {
                exp.achievements.forEach((achievement) => {
                    this.doc
                        .font(this.fonts.body)
                        .fontSize(9)
                        .fillColor(this.colors.secondary)
                        .text(`• ${achievement}`);
                });
            }
            if (index < experiences.length - 1) {
                this.doc.moveDown(0.6);
            }
        });
        this.doc.moveDown(1);
    }
    renderEducation(education) {
        this.renderSectionHeader('Education');
        education.forEach((edu, index) => {
            this.checkPageBreak(40);
            this.doc
                .font(this.fonts.heading)
                .fontSize(10)
                .fillColor(this.colors.primary)
                .text(`${edu.degree} in ${edu.field}`, { continued: true })
                .font(this.fonts.body)
                .fontSize(9)
                .fillColor(this.colors.secondary)
                .text(` | ${edu.institution} | ${this.formatDateRange(edu.startDate, edu.endDate)}`);
            if (edu.gpa) {
                this.doc
                    .font(this.fonts.body)
                    .fontSize(9)
                    .fillColor(this.colors.accent)
                    .text(`GPA: ${edu.gpa.toFixed(2)}`);
            }
            if (index < education.length - 1) {
                this.doc.moveDown(0.4);
            }
        });
        this.doc.moveDown(1);
    }
    renderSkills(skills) {
        this.renderSectionHeader('Skills');
        const skillNames = skills.map((s) => s.name).join(', ');
        this.doc
            .font(this.fonts.body)
            .fontSize(9)
            .fillColor(this.colors.text)
            .text(skillNames);
    }
}
exports.MinimalTemplate = MinimalTemplate;
//# sourceMappingURL=minimal.template.js.map