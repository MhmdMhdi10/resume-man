"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassicTemplate = void 0;
const base_template_1 = require("./base.template");
class ClassicTemplate extends base_template_1.BaseTemplate {
    constructor() {
        super(...arguments);
        this.config = {
            id: 'classic',
            name: 'Classic',
            description: 'A traditional, professional layout suitable for conservative industries',
            style: 'classic',
        };
    }
    getDefaultColors() {
        return {
            primary: '#000000',
            secondary: '#4a4a4a',
            text: '#000000',
            accent: '#000000',
            background: '#ffffff',
        };
    }
    getDefaultFonts() {
        return {
            heading: 'Times-Bold',
            body: 'Times-Roman',
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
            .fontSize(24)
            .fillColor(this.colors.primary)
            .text(fullName, { align: 'center' });
        const y = this.doc.y + 5;
        this.doc
            .strokeColor(this.colors.primary)
            .lineWidth(1)
            .moveTo(this.margin, y)
            .lineTo(this.margin + this.contentWidth, y)
            .stroke();
        this.doc.moveDown(0.5);
        const contactParts = [];
        if (personalInfo.address?.city) {
            const location = [personalInfo.address.city, personalInfo.address.state, personalInfo.address.country]
                .filter(Boolean)
                .join(', ');
            contactParts.push(location);
        }
        if (personalInfo.phone)
            contactParts.push(personalInfo.phone);
        if (personalInfo.email)
            contactParts.push(personalInfo.email);
        this.doc
            .font(this.fonts.body)
            .fontSize(10)
            .fillColor(this.colors.secondary)
            .text(contactParts.join(' • '), { align: 'center' });
        if (personalInfo.linkedIn || personalInfo.website) {
            const links = [personalInfo.linkedIn, personalInfo.website].filter(Boolean).join(' • ');
            this.doc.text(links, { align: 'center' });
        }
        this.doc.moveDown(1.5);
    }
    renderSectionHeader(title) {
        this.checkPageBreak(40);
        this.doc
            .font(this.fonts.heading)
            .fontSize(12)
            .fillColor(this.colors.primary)
            .text(title.toUpperCase(), { align: 'center' });
        const y = this.doc.y + 3;
        this.doc
            .strokeColor(this.colors.primary)
            .lineWidth(0.5)
            .moveTo(this.margin + 100, y)
            .lineTo(this.margin + this.contentWidth - 100, y)
            .stroke();
        this.doc.moveDown(0.8);
    }
    renderSummary(summary) {
        this.renderSectionHeader('Professional Summary');
        this.doc
            .font(this.fonts.body)
            .fontSize(11)
            .fillColor(this.colors.text)
            .text(summary, { align: 'justify' });
        this.doc.moveDown(1);
    }
    renderExperience(experiences) {
        this.renderSectionHeader('Professional Experience');
        experiences.forEach((exp, index) => {
            this.checkPageBreak(80);
            this.doc
                .font(this.fonts.heading)
                .fontSize(11)
                .fillColor(this.colors.primary)
                .text(exp.company, { continued: true })
                .font(this.fonts.body)
                .fontSize(10)
                .fillColor(this.colors.secondary)
                .text(`  ${this.formatDateRange(exp.startDate, exp.endDate, exp.current)}`, { align: 'right' });
            this.doc
                .font(this.fonts.body)
                .fontSize(11)
                .fillColor(this.colors.text)
                .text(exp.role, { oblique: true });
            if (exp.description) {
                this.doc.moveDown(0.3);
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
                        .text(`- ${achievement}`, { indent: 15 });
                });
            }
            if (index < experiences.length - 1) {
                this.doc.moveDown(1);
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
                .fontSize(11)
                .fillColor(this.colors.primary)
                .text(edu.institution, { continued: true })
                .font(this.fonts.body)
                .fontSize(10)
                .fillColor(this.colors.secondary)
                .text(`  ${this.formatDateRange(edu.startDate, edu.endDate)}`, { align: 'right' });
            this.doc
                .font(this.fonts.body)
                .fontSize(11)
                .fillColor(this.colors.text)
                .text(`${edu.degree} in ${edu.field}`);
            if (edu.gpa) {
                this.doc
                    .font(this.fonts.body)
                    .fontSize(10)
                    .fillColor(this.colors.secondary)
                    .text(`GPA: ${edu.gpa.toFixed(2)}`);
            }
            if (edu.achievements && edu.achievements.length > 0) {
                edu.achievements.forEach((achievement) => {
                    this.doc
                        .font(this.fonts.body)
                        .fontSize(10)
                        .fillColor(this.colors.text)
                        .text(`- ${achievement}`, { indent: 15 });
                });
            }
            if (index < education.length - 1) {
                this.doc.moveDown(0.8);
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
                .fillColor(this.colors.primary)
                .text(`${categoryName}: `, { continued: true })
                .font(this.fonts.body)
                .fillColor(this.colors.text)
                .text(skillNames);
        });
    }
}
exports.ClassicTemplate = ClassicTemplate;
//# sourceMappingURL=classic.template.js.map