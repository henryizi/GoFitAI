# Personal Information Collection Statement (PICS)
## GoFitAI - AI-Powered Health & Fitness App

*Effective Date: January 14, 2025*  
*Language: English & Traditional Chinese*

---

## ENGLISH VERSION

### Personal Information Collection Statement

**GoFitAI** respects your privacy and is committed to protecting your personal data. This Personal Information Collection Statement ("PICS") explains how we collect, use, and protect your personal information in accordance with the Personal Data (Privacy) Ordinance (Cap. 486) of Hong Kong.

#### Information We Collect:
- **Identity Information:** Name, email address, phone number
- **Health & Fitness Data:** Body measurements, weight, fitness goals, workout history
- **Biometric Data:** Body photos for composition analysis (with your explicit consent)
- **Nutritional Data:** Food photos, dietary preferences, meal history
- **Usage Data:** App interactions, preferences, and feature usage

#### Why We Collect This Information:
- **Personalized Recommendations:** AI-powered fitness and nutrition plans tailored to your goals
- **Progress Tracking:** Monitor your health and fitness journey over time
- **AI Analysis:** Body composition analysis and food recognition from photos
- **Service Improvement:** Enhance app features and user experience
- **Customer Support:** Provide assistance and resolve issues

#### How We Use AI:
GoFitAI uses artificial intelligence to analyze your photos and data to provide personalized health insights. Our AI systems:
- Analyze body photos to estimate body composition (requires explicit consent)
- Recognize foods in meal photos to estimate nutrition
- Generate personalized workout and nutrition recommendations
- You can request human review of AI decisions and explanations of how recommendations are made

#### Your Rights:
- **Access:** Request copies of your personal data
- **Correction:** Update or correct inaccurate information
- **Deletion:** Request complete removal of your account and data
- **Portability:** Receive your data in a portable format
- **Object:** Opt-out of certain data processing activities
- **Human Review:** Request human review of AI-generated recommendations

#### Data Security:
We protect your information using:
- Advanced encryption for all health and biometric data
- Secure cloud storage with access controls
- Regular security audits and monitoring
- Staff training on data protection

#### Data Sharing:
We do not sell your personal data. We may share data with:
- **AI Service Providers:** For processing and analysis (under strict agreements)
- **Cloud Infrastructure:** For secure storage and app functionality
- **Legal Requirements:** When required by law or regulation

#### Data Retention:
- **Account Data:** Retained until you delete your account
- **Health Data:** Maximum 2 years, or until you request deletion
- **Usage Data:** Maximum 1 year for service improvement
- **AI Training:** Anonymized data may be retained for model improvement

#### Contact Us:
For privacy questions or to exercise your rights:
- **Email:** privacy@gofitai.com
- **Privacy Officer:** dpo@gofitai.com
- **In-App:** Settings > Privacy & Data > Contact Privacy Team

#### Consent:
By creating an account, you consent to the collection and processing of your personal data as described in this statement and our full Privacy Policy.

**I acknowledge that I have read and understood this Personal Information Collection Statement.**

---

## 中文版本

### 個人資料收集聲明

**GoFitAI** 尊重您的私隱，並致力保護您的個人資料。本個人資料收集聲明（「收集聲明」）根據香港《個人資料（私隱）條例》（第486章）說明我們如何收集、使用和保護您的個人資料。

#### 我們收集的資料：
- **身份資料：** 姓名、電郵地址、電話號碼
- **健康及健身資料：** 身體測量數據、體重、健身目標、運動記錄
- **生物識別資料：** 身體照片用作體脂分析（需要您明確同意）
- **營養資料：** 食物照片、飲食偏好、膳食記錄
- **使用資料：** 應用程式互動、偏好設定、功能使用情況

#### 收集資料的目的：
- **個人化建議：** 根據您的目標提供AI驅動的健身和營養計劃
- **進度追蹤：** 長期監察您的健康和健身歷程
- **AI分析：** 從照片進行身體成分分析和食物識別
- **服務改善：** 增強應用程式功能和用戶體驗
- **客戶支援：** 提供協助和解決問題

#### 我們如何使用AI：
GoFitAI 使用人工智能分析您的照片和資料，以提供個人化健康洞察。我們的AI系統：
- 分析身體照片以估算身體成分（需要明確同意）
- 識別膳食照片中的食物以估算營養
- 生成個人化的運動和營養建議
- 您可以要求人工審核AI決定並解釋建議的制定方式

#### 您的權利：
- **查閱權：** 要求獲得您的個人資料副本
- **更正權：** 更新或更正不準確的資料
- **刪除權：** 要求完全移除您的帳戶和資料
- **資料可攜權：** 以可攜格式獲得您的資料
- **反對權：** 選擇退出某些資料處理活動
- **人工審核：** 要求人工審核AI生成的建議

#### 資料安全：
我們使用以下方式保護您的資料：
- 所有健康和生物識別資料採用先進加密
- 具備存取控制的安全雲端儲存
- 定期安全審核和監控
- 員工資料保護培訓

#### 資料共享：
我們不會出售您的個人資料。我們可能與以下機構共享資料：
- **AI服務供應商：** 用於處理和分析（受嚴格協議約束）
- **雲端基礎設施：** 用於安全儲存和應用程式功能
- **法律要求：** 法律或法規要求時

#### 資料保留：
- **帳戶資料：** 保留至您刪除帳戶
- **健康資料：** 最多2年，或直至您要求刪除
- **使用資料：** 最多1年用於服務改善
- **AI訓練：** 匿名化資料可能保留用於模型改善

#### 聯絡我們：
如有私隱問題或行使您的權利：
- **電郵：** privacy@gofitai.com
- **私隱主任：** dpo@gofitai.com
- **應用程式內：** 設定 > 私隱與資料 > 聯絡私隱團隊

#### 同意：
透過建立帳戶，您同意按照本聲明和我們的完整私隱政策收集和處理您的個人資料。

**我確認已閱讀並理解本個人資料收集聲明。**

---

## Implementation in Mobile App

### UI Component for Signup Flow:

```typescript
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckBox } from 'react-native-elements';

interface PICSConsentProps {
  onConsentChange: (consented: boolean) => void;
  language: 'en' | 'zh';
}

const PICSConsentScreen: React.FC<PICSConsentProps> = ({ onConsentChange, language }) => {
  const [hasReadPICS, setHasReadPICS] = useState(false);
  const [consentToCollection, setConsentToCollection] = useState(false);
  const [consentToBiometric, setConsentToBiometric] = useState(false);
  const [consentToAI, setConsentToAI] = useState(false);

  const content = {
    en: {
      title: "Personal Information Collection Statement",
      subtitle: "Please read and acknowledge our data collection practices",
      readConfirm: "I have read and understood the Personal Information Collection Statement",
      dataConsent: "I consent to the collection and processing of my personal data as described",
      biometricConsent: "I consent to the collection and AI analysis of my body photos for fitness tracking",
      aiConsent: "I consent to AI processing of my data for personalized recommendations",
      viewFullPICS: "View Full PICS Document",
      continue: "Continue with Registration",
      summary: {
        collect: "We collect identity, health, and usage data",
        purpose: "For personalized AI fitness and nutrition recommendations", 
        ai: "AI analyzes photos for body composition and food recognition",
        rights: "You can access, correct, delete, or port your data anytime",
        security: "All data is encrypted and securely protected"
      }
    },
    zh: {
      title: "個人資料收集聲明",
      subtitle: "請閱讀並確認我們的資料收集做法",
      readConfirm: "我已閱讀並理解個人資料收集聲明",
      dataConsent: "我同意按照描述收集和處理我的個人資料",
      biometricConsent: "我同意收集和AI分析我的身體照片用於健身追蹤",
      aiConsent: "我同意AI處理我的資料以提供個人化建議",
      viewFullPICS: "查看完整收集聲明",
      continue: "繼續註冊",
      summary: {
        collect: "我們收集身份、健康和使用資料",
        purpose: "用於個人化AI健身和營養建議",
        ai: "AI分析照片進行身體成分和食物識別", 
        rights: "您隨時可以查閱、更正、刪除或攜帶您的資料",
        security: "所有資料均經加密並受到安全保護"
      }
    }
  };

  const t = content[language];

  const allConsentsGiven = hasReadPICS && consentToCollection && consentToBiometric && consentToAI;

  React.useEffect(() => {
    onConsentChange(allConsentsGiven);
  }, [allConsentsGiven, onConsentChange]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t.title}</Text>
      <Text style={styles.subtitle}>{t.subtitle}</Text>
      
      <View style={styles.summaryBox}>
        <Text style={styles.summaryTitle}>Key Points:</Text>
        <Text style={styles.summaryItem}>• {t.summary.collect}</Text>
        <Text style={styles.summaryItem}>• {t.summary.purpose}</Text>
        <Text style={styles.summaryItem}>• {t.summary.ai}</Text>
        <Text style={styles.summaryItem}>• {t.summary.rights}</Text>
        <Text style={styles.summaryItem}>• {t.summary.security}</Text>
      </View>

      <TouchableOpacity style={styles.viewFullButton}>
        <Text style={styles.viewFullText}>{t.viewFullPICS}</Text>
      </TouchableOpacity>

      <View style={styles.consentSection}>
        <CheckBox
          title={t.readConfirm}
          checked={hasReadPICS}
          onPress={() => setHasReadPICS(!hasReadPICS)}
          containerStyle={styles.checkboxContainer}
        />
        
        <CheckBox
          title={t.dataConsent}
          checked={consentToCollection}
          onPress={() => setConsentToCollection(!consentToCollection)}
          containerStyle={styles.checkboxContainer}
        />
        
        <CheckBox
          title={t.biometricConsent}
          checked={consentToBiometric}
          onPress={() => setConsentToBiometric(!consentToBiometric)}
          containerStyle={styles.checkboxContainer}
        />
        
        <CheckBox
          title={t.aiConsent}
          checked={consentToAI}
          onPress={() => setConsentToAI(!consentToAI)}
          containerStyle={styles.checkboxContainer}
        />
      </View>

      <TouchableOpacity 
        style={[styles.continueButton, !allConsentsGiven && styles.disabledButton]}
        disabled={!allConsentsGiven}
      >
        <Text style={styles.continueText}>{t.continue}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryBox: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryItem: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 5,
  },
  viewFullButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  viewFullText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  consentSection: {
    marginBottom: 30,
  },
  checkboxContainer: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  continueButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  continueText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PICSConsentScreen;
```

### Integration with Registration Flow:

```typescript
// In your registration component
const handlePICSConsent = (consented: boolean) => {
  setCanProceedWithRegistration(consented);
  
  // Log consent for audit purposes
  logConsentEvent({
    userId: tempUserId,
    consentType: 'PICS_acknowledgment',
    granted: consented,
    timestamp: new Date(),
    ipAddress: userIPAddress,
    userAgent: deviceInfo.userAgent
  });
};
```

This PICS implementation provides:
- ✅ **Bilingual Support:** English and Traditional Chinese
- ✅ **Clear Information:** Summary of key data practices
- ✅ **Granular Consent:** Separate consent for different data types
- ✅ **User-Friendly:** Mobile-optimized interface
- ✅ **Compliance:** Meets PDPO requirements
- ✅ **Audit Trail:** Logs all consent decisions

---

**Legal Disclaimer:** This PICS should be reviewed by qualified legal counsel familiar with Hong Kong privacy law before implementation. Regular updates may be required based on regulatory changes or business practice modifications.
