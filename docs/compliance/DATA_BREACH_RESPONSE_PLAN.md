# Data Breach Response Plan - GoFitAI

## PDPO Compliance & Incident Response

*Last Updated: 2025-01-14*  
*Review Date: 2025-07-14*  
*Classification: Internal Use Only*

---

## 1. EMERGENCY CONTACT INFORMATION

### Internal Response Team
| Role | Contact | Primary | Backup |
|------|---------|---------|---------|
| **Data Protection Officer** | dpo@gofitai.com | +852 xxxx-xxxx | +852 xxxx-xxxx |
| **Security Lead** | security@gofitai.com | +852 xxxx-xxxx | +852 xxxx-xxxx |
| **Legal Counsel** | legal@gofitai.com | +852 xxxx-xxxx | +852 xxxx-xxxx |
| **CEO/Management** | ceo@gofitai.com | +852 xxxx-xxxx | +852 xxxx-xxxx |
| **Technical Lead** | tech@gofitai.com | +852 xxxx-xxxx | +852 xxxx-xxxx |

### External Authorities
| Organization | Contact Information | When to Contact |
|--------------|-------------------|-----------------|
| **Privacy Commissioner for Personal Data (PCPD)** | +852 2827 2827<br>complaints@pcpd.org.hk<br>pcpd.org.hk | Within 72 hours of discovery |
| **Hong Kong Police Cyber Security & Technology Crime Bureau** | +852 2860 5012 | Criminal activity suspected |
| **Legal Advisors** | [External Law Firm] | Legal guidance needed |
| **Cyber Security Forensics** | [Forensics Partner] | Technical investigation required |

### Key Service Providers
| Service | Contact | Emergency Contact |
|---------|---------|------------------|
| **Supabase (Database)** | support@supabase.io | [Emergency Support] |
| **Cloud Storage Provider** | [Provider Support] | [Emergency Support] |
| **AI Service Providers** | DeepSeek, Gemini Support | [Emergency Support] |

---

## 2. IMMEDIATE RESPONSE PROCEDURES (0-4 HOURS)

### Phase 1: Discovery & Initial Assessment

#### 2.1 Incident Identification
**WHO CAN REPORT:** Any team member, user, or automated system
**HOW TO REPORT:** Email security@gofitai.com or call emergency numbers

#### 2.2 Immediate Actions (First 30 Minutes)
1. **STOP THE BREACH**
   - Isolate affected systems immediately
   - Revoke compromised credentials
   - Block suspicious IP addresses
   - Disable compromised user accounts

2. **SECURE THE SCENE**
   - Do not delete or modify logs
   - Preserve evidence for investigation
   - Document all actions taken
   - Restrict access to affected systems

3. **ALERT THE TEAM**
   - Notify Data Protection Officer immediately
   - Alert Security Lead and Technical Lead
   - Activate incident response team
   - Set up emergency communication channel

#### 2.3 Initial Assessment (30-60 Minutes)
**Determine:**
- What personal data is involved?
- How many users are potentially affected?
- What is the nature of the security incident?
- Is the breach ongoing or contained?
- What is the potential harm to individuals?

#### 2.4 Risk Classification
| **HIGH RISK** | **MEDIUM RISK** | **LOW RISK** |
|---------------|-----------------|--------------|
| • Sensitive health data exposed<br>• Large number of users affected (>1000)<br>• Identity theft risk<br>• Ongoing unauthorized access | • Limited personal data exposed<br>• Moderate number of users affected (100-1000)<br>• Technical vulnerabilities exploited | • Non-sensitive data exposed<br>• Small number of users affected (<100)<br>• Minimal harm potential |

---

## 3. REGULATORY NOTIFICATION (4-72 HOURS)

### 3.1 PCPD Notification Requirements
**TIMELINE:** Within 72 hours of becoming aware of the breach

#### Notification Form Content:
1. **Basic Information**
   - Name and contact details of the data controller
   - Description of the personal data breach
   - Date and time of the breach (estimated if unknown)

2. **Data Involved**
   - Categories of personal data affected
   - Number of individuals affected (approximate)
   - Types of personal data (health, biometric, contact info, etc.)

3. **Circumstances**
   - How the breach occurred
   - What security measures were bypassed
   - Whether the breach is ongoing

4. **Impact Assessment**
   - Potential consequences for individuals
   - Risk of identity theft, financial loss, etc.
   - Special categories of data involved

5. **Remedial Actions**
   - Steps taken to address the breach
   - Measures to mitigate potential adverse effects
   - Recommendations for affected individuals

#### PCPD Notification Template:
```
URGENT: PERSONAL DATA BREACH NOTIFICATION

To: Privacy Commissioner for Personal Data
From: GoFitAI Data Protection Officer
Date: [DATE]
Subject: Personal Data Breach Notification - Ref: [INCIDENT-ID]

1. CONTROLLER INFORMATION
Company: GoFitAI
DPO: [Name, Email, Phone]
Address: [Company Address]

2. BREACH DETAILS
Discovery Date: [DATE/TIME]
Estimated Occurrence: [DATE/TIME]
Incident Type: [Unauthorized access/Accidental disclosure/etc.]

3. DATA AFFECTED
Data Categories: [Health data/Photos/Contact info/etc.]
Number of Individuals: [Approximate number]
Special Categories: [Yes/No - specify if health data]

4. CIRCUMSTANCES
Description: [Detailed description of how breach occurred]
Security Measures Bypassed: [What protections failed]
Current Status: [Ongoing/Contained]

5. RISK ASSESSMENT
Potential Harm: [High/Medium/Low]
Risk Description: [Specific risks to individuals]

6. REMEDIAL ACTIONS
Immediate Actions: [Steps taken]
Ongoing Measures: [Continued protection measures]
User Notification Plan: [How/when users will be informed]

Contact: dpo@gofitai.com | +852 xxxx-xxxx
```

### 3.2 Documentation Requirements
- Incident timeline and chronology
- Evidence preservation log
- Communication records
- Risk assessment documentation
- Remedial action records

---

## 4. USER NOTIFICATION (72 HOURS - 7 DAYS)

### 4.1 Notification Decision Matrix
| Risk Level | Notification Required | Timeline | Method |
|------------|----------------------|----------|---------|
| **High Risk** | Yes - Mandatory | Within 72 hours | Email + In-app + Website |
| **Medium Risk** | Yes - Recommended | Within 5 days | Email + In-app |
| **Low Risk** | Consider case-by-case | Within 7 days | In-app notification |

### 4.2 User Notification Template

#### Email Subject: "Important Security Notice - GoFitAI Data Incident"

```
Dear [User Name],

We are writing to inform you of a security incident that may have affected your personal information stored with GoFitAI.

WHAT HAPPENED:
On [DATE], we discovered [brief description of incident]. We immediately took action to secure our systems and are working with cybersecurity experts to investigate.

INFORMATION INVOLVED:
The following information may have been accessed:
• [Specific data categories - be precise]
• [Time period of data affected]

WHAT WE ARE DOING:
• Immediately secured the affected systems
• Launched a comprehensive investigation
• Implemented additional security measures
• Reported the incident to Hong Kong's Privacy Commissioner
• Are working with law enforcement as appropriate

WHAT YOU SHOULD DO:
• Monitor your accounts for any suspicious activity
• [Specific recommendations based on data type]
• Update your GoFitAI password as a precaution
• Contact us with any questions or concerns

YOUR RIGHTS:
Under Hong Kong's Personal Data (Privacy) Ordinance, you have the right to:
• Request details about how your data was affected
• Access your personal data we hold
• Request correction or deletion of your data
• Lodge a complaint with the Privacy Commissioner

We sincerely apologize for this incident and any inconvenience it may cause. We are committed to protecting your personal information and have taken steps to prevent similar incidents in the future.

For questions or concerns:
Email: privacy@gofitai.com
Phone: +852 xxxx-xxxx

You can also contact Hong Kong's Privacy Commissioner at:
Phone: +852 2827 2827
Email: complaints@pcpd.org.hk

Sincerely,
[Name]
Data Protection Officer
GoFitAI
```

#### In-App Notification:
```
Security Notice

We recently experienced a security incident that may have affected your account. We've taken immediate action to secure our systems.

[Brief description of what happened and what data was involved]

Your account remains secure, but we recommend:
• Updating your password
• Reviewing your account for any unusual activity

We've reported this incident to Hong Kong authorities and are taking steps to prevent future incidents.

[View Full Details] [Contact Support] [Dismiss]
```

### 4.3 Website Notice
Post prominent notice on website and app store pages acknowledging the incident and providing information.

---

## 5. INVESTIGATION & FORENSICS (ONGOING)

### 5.1 Technical Investigation
1. **Preserve Evidence**
   - Create forensic images of affected systems
   - Preserve log files and audit trails
   - Document system states and configurations

2. **Root Cause Analysis**
   - Identify attack vectors and vulnerabilities
   - Timeline reconstruction
   - Impact assessment
   - Security control failures

3. **External Forensics** (if required)
   - Engage qualified cybersecurity firm
   - Coordinate with law enforcement
   - Preserve chain of custody

### 5.2 Investigation Documentation
- Detailed incident report
- Timeline of events
- Evidence inventory
- Interview records
- Technical findings
- Legal analysis

---

## 6. CONTAINMENT & RECOVERY

### 6.1 Short-term Containment
- Isolate affected systems
- Patch vulnerabilities
- Reset compromised credentials
- Enhanced monitoring

### 6.2 Long-term Recovery
- System restoration from clean backups
- Security architecture review
- Implementation of additional controls
- User re-authentication process

### 6.3 Monitoring & Validation
- Continuous monitoring for additional indicators
- Validation of containment measures
- User account monitoring
- System integrity verification

---

## 7. POST-INCIDENT ACTIVITIES

### 7.1 Lessons Learned Review
**Within 30 days of incident resolution:**
- Conduct post-incident review meeting
- Document lessons learned
- Identify process improvements
- Update incident response procedures

### 7.2 Security Improvements
- Implement additional security controls
- Update security policies and procedures
- Enhanced monitoring and detection
- Staff security training updates

### 7.3 Compliance Follow-up
- PCPD compliance reporting
- Legal requirement review
- Insurance claim processing
- Third-party security assessments

---

## 8. COMMUNICATION TEMPLATES

### 8.1 Internal Communication Templates

#### Initial Alert Email:
```
Subject: URGENT - Security Incident Response Activated

Team,

A potential security incident has been identified:
• Discovery Time: [TIME]
• Affected System: [SYSTEM]
• Potential Data Impact: [IMPACT]
• Initial Assessment: [HIGH/MEDIUM/LOW]

IMMEDIATE ACTIONS REQUIRED:
• Do not access affected systems unless authorized
• Preserve all logs and evidence
• Report to incident command at [PHONE]

Next update in 1 hour.

[Incident Commander]
```

#### Team Update Template:
```
Subject: Security Incident Update #[NUMBER] - [STATUS]

Current Status: [CONTAINED/ONGOING/RESOLVED]
Time Since Discovery: [X HOURS]

KEY UPDATES:
• [Update 1]
• [Update 2]
• [Update 3]

NEXT ACTIONS:
• [Action 1 - Owner - Timeline]
• [Action 2 - Owner - Timeline]

Next update: [TIME]
```

### 8.2 Media Response Template (if needed)
```
GoFitAI recently became aware of a security incident affecting some user data. We immediately took action to secure our systems and are conducting a thorough investigation.

We have notified affected users and relevant authorities, including Hong Kong's Privacy Commissioner for Personal Data. We are committed to transparency and will provide updates as our investigation progresses.

The security and privacy of our users' data is our top priority. We have implemented additional security measures and are working with cybersecurity experts to prevent similar incidents.

For more information: privacy@gofitai.com
```

---

## 9. LEGAL & REGULATORY CONSIDERATIONS

### 9.1 Hong Kong PDPO Requirements
- **Notification Timeline:** Within 72 hours to PCPD
- **User Notification:** Without undue delay if high risk
- **Documentation:** Maintain detailed records
- **Cooperation:** Full cooperation with PCPD investigation

### 9.2 Other Regulatory Considerations
- **Cross-border data transfer implications**
- **International user considerations**
- **Industry-specific requirements**
- **Insurance policy requirements**

### 9.3 Legal Risks & Liability
- Potential regulatory fines
- User lawsuits and class actions
- Reputational damage
- Business continuity impact

---

## 10. TESTING & MAINTENANCE

### 10.1 Regular Testing
- **Quarterly:** Tabletop exercises
- **Annually:** Full incident response simulation
- **Ad-hoc:** After significant system changes

### 10.2 Plan Maintenance
- **Monthly:** Contact information verification
- **Quarterly:** Procedure review and updates
- **Annually:** Complete plan review
- **As needed:** Updates for regulatory changes

### 10.3 Training Requirements
- All staff: Basic incident awareness (annually)
- Technical team: Detailed response procedures (quarterly)
- Management: Decision-making protocols (annually)
- DPO: Advanced privacy incident management (ongoing)

---

## 11. METRICS & REPORTING

### 11.1 Key Performance Indicators
- Time to discovery
- Time to containment
- Time to user notification
- Time to regulatory notification
- Number of affected users
- Duration of investigation

### 11.2 Monthly Reporting
- Incident summary report
- Security metrics dashboard
- Compliance status update
- Process improvement tracking

### 11.3 Annual Review
- Comprehensive incident analysis
- Plan effectiveness assessment
- Regulatory compliance review
- Security posture evaluation

---

## APPENDICES

### Appendix A: Incident Classification Matrix
### Appendix B: Contact Directory (Full)
### Appendix C: Technical Response Procedures
### Appendix D: Legal Notice Templates
### Appendix E: Evidence Preservation Checklist
### Appendix F: User Communication Scripts

---

**Document Control:**
- **Owner:** Data Protection Officer
- **Approved by:** CEO
- **Distribution:** Senior Management, Security Team, Legal
- **Classification:** Internal Use Only
- **Next Review:** July 2025

**For immediate assistance during a security incident:**
📞 **Security Hotline:** +852 xxxx-xxxx (24/7)
📧 **Emergency Email:** security@gofitai.com
