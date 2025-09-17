# PDPO Data Inventory - GoFitAI

## Data Collection Inventory

This document catalogs all personal data collected by GoFitAI in compliance with Hong Kong's Personal Data (Privacy) Ordinance (PDPO).

*Last Updated: 2025-01-14*
*Review Date: 2025-07-14*

---

## 1. User Profile Data

### 1.1 Basic Profile Information
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| User ID (UUID) | Account identification | Legitimate interest | Supabase auth.users | Account lifetime + 12 months |
| Email address | Account creation, authentication, communication | Contract performance | Supabase auth.users | Account lifetime + 12 months |
| Full name | Personalization, account identification | User consent | Supabase profiles table | Account lifetime + 12 months |
| Username | Display name, social features | User consent | Supabase profiles table | Account lifetime + 12 months |
| Password (hashed) | Account security, authentication | Contract performance | Supabase auth.users | Account lifetime + 12 months |
| Created/Updated timestamps | Account management, compliance | Legitimate interest | Supabase profiles table | Account lifetime + 12 months |

### 1.2 Physical Characteristics
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Birthday/Age | Age verification, fitness calculations | User consent | Supabase profiles.birthday | Account lifetime + 12 months |
| Gender | Personalized recommendations, BMR calculations | User consent | Supabase profiles.gender | Account lifetime + 12 months |
| Height (cm/ft) | BMI calculations, workout planning | User consent | Supabase profiles.height_cm | Account lifetime + 12 months |
| Weight (kg/lbs) | BMI calculations, calorie planning | User consent | Supabase profiles.weight_kg | Account lifetime + 12 months |
| Body fat percentage | Body composition analysis | User consent | Supabase profiles.body_fat | Account lifetime + 12 months |
| Height/Weight units preference | User experience | User consent | Supabase profiles.height_unit_preference | Account lifetime + 12 months |

### 1.3 Fitness Profile
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Training level | Workout plan customization | User consent | Supabase profiles.training_level | Account lifetime + 12 months |
| Primary fitness goal | Personalized recommendations | User consent | Supabase profiles.primary_goal | Account lifetime + 12 months |
| Workout frequency preference | Exercise planning | User consent | Supabase profiles.workout_frequency | Account lifetime + 12 months |
| Exercise frequency | Activity level assessment | User consent | Supabase profiles.exercise_frequency | Account lifetime + 12 months |
| Activity level | Calorie calculations | User consent | Supabase profiles.activity_level | Account lifetime + 12 months |
| Fitness strategy | Goal-specific planning | User consent | Supabase profiles.fitness_strategy | Account lifetime + 12 months |
| Weight trend | Progress tracking | User consent | Supabase profiles.weight_trend | Account lifetime + 12 months |
| Onboarding completion status | User experience flow | Legitimate interest | Supabase profiles.onboarding_completed | Account lifetime |

---

## 2. Health & Biometric Data

### 2.1 Body Photos
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Body photo (front/back) | AI aesthetic analysis | Explicit consent | Supabase Storage + body_photos table | Account lifetime + 12 months |
| Photo URL | Image access, display | Legitimate interest | Supabase body_photos.photo_url | Account lifetime + 12 months |
| Storage path | File management | Legitimate interest | Supabase body_photos.storage_path | Account lifetime + 12 months |
| Upload timestamp | Data management, compliance | Legitimate interest | Supabase body_photos.uploaded_at | Account lifetime + 12 months |
| Analysis status | Processing workflow | Legitimate interest | Supabase body_photos.analysis_status | Account lifetime + 12 months |
| AI analysis flag | Service functionality | Legitimate interest | Supabase body_photos.is_analyzed | Account lifetime + 12 months |

### 2.2 Body Analysis Results
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Body part ratings (1-10) | Aesthetic assessment | Explicit consent | Supabase body_analysis table | Account lifetime + 12 months |
| Overall rating | Progress tracking | Explicit consent | Supabase body_analysis.overall_rating | Account lifetime + 12 months |
| Strongest/weakest body part | Targeted recommendations | Explicit consent | Supabase body_analysis.strongest/weakest_body_part | Account lifetime + 12 months |
| AI feedback text | Personalized advice | Explicit consent | Supabase body_analysis.ai_feedback | Account lifetime + 12 months |
| Detailed analysis data (JSON) | Complete AI assessment | Explicit consent | Supabase body_analysis.analysis_data | Account lifetime + 12 months |
| Analysis timestamp | Progress tracking | Legitimate interest | Supabase body_analysis.created_at | Account lifetime + 12 months |

---

## 3. Workout & Exercise Data

### 3.1 Workout Plans
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Workout plan name | Organization, identification | User consent | Supabase workout_plans.plan_name | Account lifetime + 12 months |
| Goal type | Plan customization | User consent | Supabase workout_plans.goal_type | Account lifetime + 12 months |
| Difficulty level | Appropriate exercise selection | User consent | Supabase workout_plans.difficulty_level | Account lifetime + 12 months |
| Duration (weeks) | Progress planning | User consent | Supabase workout_plans.duration_weeks | Account lifetime + 12 months |
| Active status | Current plan tracking | Legitimate interest | Supabase workout_plans.is_active | Account lifetime + 12 months |

### 3.2 Workout Sessions & Performance
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Session completion status | Progress tracking | User consent | Supabase workout_sessions.status | Account lifetime + 12 months |
| Completion timestamp | Progress analytics | User consent | Supabase workout_sessions.completed_at | Account lifetime + 12 months |
| Week/day numbers | Program structure | Legitimate interest | Supabase workout_sessions.week_number/day_number | Account lifetime + 12 months |
| Exercise set logs | Performance tracking | User consent | Supabase exercise_logs table | Account lifetime + 12 months |
| Actual reps performed | Progress monitoring | User consent | Supabase exercise_logs.actual_reps | Account lifetime + 12 months |
| Weight lifted | Strength tracking | User consent | Supabase exercise_logs.actual_weight | Account lifetime + 12 months |
| RPE (Rate of Perceived Exertion) | Intensity monitoring | User consent | Supabase exercise_logs.actual_rpe | Account lifetime + 12 months |
| Exercise notes | Personal tracking | User consent | Supabase exercise_logs.notes | Account lifetime + 12 months |

### 3.3 Workout History (Permanent)
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Workout completion records | Long-term progress tracking | User consent | Supabase workout_history table | **PERMANENT** (survives plan deletion) |
| Plan name (stored copy) | Historical reference | User consent | Supabase workout_history.plan_name | **PERMANENT** |
| Session name (stored copy) | Historical reference | User consent | Supabase workout_history.session_name | **PERMANENT** |
| Workout duration | Performance analytics | User consent | Supabase workout_history.duration_minutes | **PERMANENT** |
| Total sets completed | Progress metrics | User consent | Supabase workout_history.total_sets | **PERMANENT** |
| Total exercises | Workout scope tracking | User consent | Supabase workout_history.total_exercises | **PERMANENT** |
| Estimated calories burned | Health insights | User consent | Supabase workout_history.estimated_calories | **PERMANENT** |
| Exercises data (JSON) | Complete workout record | User consent | Supabase workout_history.exercises_data | **PERMANENT** |
| Workout notes | Personal records | User consent | Supabase workout_history.notes | **PERMANENT** |

---

## 4. Nutrition & Food Data

### 4.1 Food Photos & Analysis
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Food photos | AI nutrition analysis | Explicit consent | Server storage + API processing | Processed immediately, not permanently stored |
| Food identification results | Nutrition tracking | User consent | Client-side/temporary | Session-based (not permanently stored) |
| Estimated nutritional values | Calorie tracking | User consent | Client-side/temporary | Session-based (not permanently stored) |
| AI confidence scores | Service quality | Legitimate interest | Server logs | 30 days |

### 4.2 Food Logs & Nutrition Tracking
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Food entry names | Nutrition tracking | User consent | Supabase nutrition tables | Account lifetime + 12 months |
| Calorie values | Dietary monitoring | User consent | Supabase nutrition tables | Account lifetime + 12 months |
| Macronutrients (protein/carbs/fat) | Nutrition analysis | User consent | Supabase nutrition tables | Account lifetime + 12 months |
| Meal timestamps | Eating patterns | User consent | Supabase nutrition tables | Account lifetime + 12 months |
| Serving sizes | Portion tracking | User consent | Supabase nutrition tables | Account lifetime + 12 months |

### 4.3 Nutrition Plans
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Daily calorie targets | Nutrition guidance | User consent | Supabase nutrition_plans table | Account lifetime + 12 months |
| Macronutrient ratios | Diet customization | User consent | Supabase nutrition_plans table | Account lifetime + 12 months |
| Meal planning preferences | Personalized recommendations | User consent | Supabase nutrition_plans table | Account lifetime + 12 months |
| Dietary restrictions | Safe recommendations | User consent | Supabase nutrition_plans table | Account lifetime + 12 months |

---

## 5. AI Processing Data

### 5.1 AI Analysis Inputs
| Data Category | AI Service | Purpose | Data Processed | Retention |
|---------------|------------|---------|----------------|-----------|
| Body photos | DeepSeek Vision | Aesthetic analysis | Image data | Processed on-demand, not stored by AI service |
| Food photos | Gemini Vision | Nutrition analysis | Image data | Processed on-demand, not stored by AI service |
| User prompts | DeepSeek Chat | Fitness advice | Text queries | Not stored permanently by AI service |
| Profile data | Internal algorithms | Recommendation generation | Health metrics | Stored in our database only |

### 5.2 AI Analysis Outputs
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Body analysis ratings | User feedback | Explicit consent | Supabase body_analysis table | Account lifetime + 12 months |
| Nutrition estimates | Dietary tracking | User consent | Client-side/temporary processing | Session-based |
| Workout recommendations | Fitness guidance | User consent | Generated on-demand | Not permanently stored |
| AI chat responses | User assistance | User consent | Not stored | Session-based |

---

## 6. Technical & Analytics Data

### 6.1 App Usage Data
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Feature usage analytics | Service improvement | Legitimate interest | Analytics services | 24 months (anonymized) |
| Session duration | User experience optimization | Legitimate interest | Analytics services | 24 months (anonymized) |
| Error logs | Technical support | Legitimate interest | Server logs | 90 days |
| Crash reports | App stability | Legitimate interest | Crash reporting services | 90 days |

### 6.2 Device Information
| Data Field | Purpose | Legal Basis | Storage Location | Retention Period |
|------------|---------|-------------|------------------|------------------|
| Device model | Compatibility, support | Legitimate interest | Analytics services | 24 months (anonymized) |
| Operating system version | Technical support | Legitimate interest | Analytics services | 24 months (anonymized) |
| App version | Bug tracking, updates | Legitimate interest | Analytics services | 24 months (anonymized) |
| Screen resolution | UI optimization | Legitimate interest | Analytics services | 24 months (anonymized) |

---

## 7. Data Minimization Principles

### What We DON'T Collect:
- ❌ Precise location data
- ❌ Contact lists or social media connections
- ❌ Financial information (handled by payment processors)
- ❌ Voice recordings or audio data
- ❌ Browsing history outside the app
- ❌ Biometric identifiers (fingerprints, face recognition)
- ❌ Medical records or clinical data
- ❌ Insurance information
- ❌ Government ID numbers

### Data We Process but Don't Store:
- 🔄 Food photos (processed for analysis, then deleted)
- 🔄 AI chat conversations (not permanently logged)
- 🔄 Temporary session data
- 🔄 In-transit data during API calls

---

## 8. Third-Party Data Sharing

### AI Processing Services
| Service | Data Shared | Purpose | Data Protection |
|---------|-------------|---------|-----------------|
| DeepSeek (via OpenRouter) | Body photos, user prompts | AI analysis | No permanent storage, encrypted in transit |
| Google Gemini | Food photos | Nutrition analysis | No permanent storage, encrypted in transit |
| Supabase | All user data | Database hosting | EU adequacy decision, GDPR compliant |

### Analytics Services
| Service | Data Shared | Purpose | Data Protection |
|---------|-------------|---------|-----------------|
| Internal Analytics | Anonymized usage data | Service improvement | No personal identifiers |

---

## 9. Data Deletion Procedures

### User-Initiated Deletion (Account Deletion)
1. **Immediate deletion:**
   - Profile data from Supabase profiles table
   - Body photos from Supabase Storage
   - Workout plans and sessions
   - Food logs and nutrition data
   - Authentication data

2. **Retained for 12 months (backup purposes):**
   - Encrypted backups in separate storage
   - Automatically purged after retention period

3. **Permanently retained (anonymized):**
   - Aggregated analytics data (no personal identifiers)
   - Service improvement insights

### System-Initiated Deletion
- **Inactive accounts (3+ years):** Automatic deletion process
- **GDPR/PDPO requests:** Manual deletion within 30 days
- **Legal obligations:** Retained as required by law

---

## 10. Data Breach Response Plan

### Immediate Response (0-24 hours)
1. **Contain the breach:** Isolate affected systems
2. **Assess impact:** Determine data categories and user count affected
3. **Document incident:** Create detailed incident report
4. **Internal notification:** Alert leadership and DPO

### Regulatory Notification (24-72 hours)
1. **PCPD notification:** Submit breach report within 72 hours
2. **Risk assessment:** Evaluate potential harm to data subjects
3. **Prepare user notification:** Draft clear, informative communication

### User Notification (72+ hours)
1. **Direct notification:** Email all affected users
2. **Public disclosure:** Update privacy policy and website
3. **Support response:** Provide dedicated support channels
4. **Remediation:** Implement protective measures and monitoring

### Contact Information for Breaches
- **Internal DPO:** dpo@gofitai.com
- **PCPD Hotline:** +852 2827 2827
- **Emergency Contact:** security@gofitai.com

---

## 11. Privacy Impact Assessment (PIA) Summary

### High-Risk Processing Activities
1. **Body photo AI analysis** - Biometric processing, automated decision-making
2. **Health data aggregation** - Sensitive personal data processing
3. **Automated workout planning** - Algorithm-based recommendations
4. **Cross-border data transfers** - International AI service providers

### Risk Mitigation Measures
- ✅ Explicit consent for all sensitive data processing
- ✅ Data encryption in transit and at rest
- ✅ Regular security audits and penetration testing
- ✅ Human oversight for AI decision-making
- ✅ User control over automated processing
- ✅ Clear data retention and deletion policies
- ✅ PDPO-compliant privacy notices
- ✅ Regular staff privacy training

---

## 12. Review and Updates

### Regular Review Schedule
- **Quarterly:** Data inventory updates
- **Bi-annually:** Privacy policy review
- **Annually:** Full PIA review
- **Ad-hoc:** After significant feature changes

### Change Management
- Document all changes to data processing
- Update privacy notices when required
- Obtain new consent for material changes
- Notify users of policy updates

---

## Contact Information

**Data Protection Officer:** dpo@gofitai.com  
**Privacy Team:** privacy@gofitai.com  
**General Support:** support@gofitai.com  

**Privacy Commissioner for Personal Data, Hong Kong:**  
Website: pcpd.org.hk  
Hotline: +852 2827 2827  
Email: complaints@pcpd.org.hk
