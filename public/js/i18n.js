/**
 * Internationalization (i18n) Module
 * Supports English (en), Spanish (es), Hindi (hi), and French (fr)
 */

const translations = {
  en: {
    system_title: 'Official Certificate Studio & Verification Portal',
    nav_dashboard: 'Dashboard',
    nav_create: 'Create Certificate',
    nav_approvals: 'Approvals',
    nav_library: 'Certificate Library',
    nav_bulk: 'Bulk Import',
    nav_settings: 'Club Settings',
    nav_integration: 'Website Integration',
    nav_logs: 'Audit Logs',
    btn_verify: 'Verify Certificate',
    btn_visit_club: 'Visit Official Club Website',
    btn_download_pdf: 'Download PDF Certificate',
    btn_copy_link: 'Copy Verification Link',
    verified_valid: 'VERIFIED AND VALID',
    tamper_detected: 'TAMPER DETECTED / INVALID',
    revoked: 'CERTIFICATE REVOKED',
    tamper_match: 'Certificate data matches the official cryptographic record (SHA-256 verified).',
    tamper_warning: 'Tamper warning: Certificate data does not match the stored cryptographic signature!',
    issued_by: 'Issued By',
    issue_date: 'Issue Date',
    cert_number: 'Certificate Number',
    recipient_name: 'Recipient Name',
    achievement: 'Recognition / Achievement',
    status: 'Validity Status'
  },
  es: {
    system_title: 'Estudio y Portal Oficial de Verificación de Certificados',
    nav_dashboard: 'Panel de Control',
    nav_create: 'Crear Certificado',
    nav_approvals: 'Aprobaciones',
    nav_library: 'Biblioteca de Certificados',
    nav_bulk: 'Importación Masiva',
    nav_settings: 'Configuración del Club',
    nav_integration: 'Integración Web',
    nav_logs: 'Registros de Auditoría',
    btn_verify: 'Verificar Certificado',
    btn_visit_club: 'Visitar Sitio Web Oficial del Club',
    btn_download_pdf: 'Descargar Certificado en PDF',
    btn_copy_link: 'Copiar Enlace de Verificación',
    verified_valid: 'VERIFICADO Y VÁLIDO',
    tamper_detected: 'ALTERACIÓN DETECTADA / NO VÁLIDO',
    revoked: 'CERTIFICADO REVOCADO',
    tamper_match: 'Los datos coinciden con el registro criptográfico oficial (SHA-256 verificado).',
    tamper_warning: 'Advertencia: Los datos no coinciden con la firma criptográfica registrada.',
    issued_by: 'Emitido Por',
    issue_date: 'Fecha de Emisión',
    cert_number: 'Número de Certificado',
    recipient_name: 'Nombre del Titular',
    achievement: 'Reconocimiento / Logro',
    status: 'Estado de Validez'
  },
  hi: {
    system_title: 'आधिकारिक प्रमाण पत्र निर्माण एवं सत्यापन पोर्टल',
    nav_dashboard: 'डैशबोर्ड',
    nav_create: 'प्रमाण पत्र बनाएं',
    nav_approvals: 'स्वीकृति अनुरोध',
    nav_library: 'प्रमाण पत्र संग्रह',
    nav_bulk: 'थोक निर्माण',
    nav_settings: 'क्लब सेटिंग्स',
    nav_integration: 'वेबसाइट एकीकरण',
    nav_logs: 'ऑडिट लॉग्स',
    btn_verify: 'प्रमाण पत्र सत्यापित करें',
    btn_visit_club: 'आधिकारिक क्लब वेबसाइट पर जाएं',
    btn_download_pdf: 'पीडीएफ प्रमाण पत्र डाउनलोड करें',
    btn_copy_link: 'सत्यापन लिंक कॉपी करें',
    verified_valid: 'सत्यापित एवं वैध',
    tamper_detected: 'छेड़छाड़ का संदेह / अमान्य',
    revoked: 'प्रमाण पत्र निरस्त',
    tamper_match: 'डेटा आधिकारिक क्रिप्टोग्राफ़िक रिकॉर्ड (SHA-256) से पूर्णतः मेल खाता है।',
    tamper_warning: 'चेतावनी: प्रमाण पत्र का डेटा क्रिप्टोग्राफ़िक हस्ताक्षर से मेल नहीं खाता!',
    issued_by: 'जारीकर्ता',
    issue_date: 'जारी करने की तिथि',
    cert_number: 'प्रमाण पत्र संख्या',
    recipient_name: 'प्राप्तकर्ता का नाम',
    achievement: 'उपलब्धि / विवरण',
    status: 'वैधता स्थिति'
  },
  fr: {
    system_title: 'Studio et Portail Officiel de Vérification des Certificats',
    nav_dashboard: 'Tableau de Bord',
    nav_create: 'Créer un Certificat',
    nav_approvals: 'Approbations',
    nav_library: 'Bibliothèque',
    nav_bulk: 'Importation en Masse',
    nav_settings: 'Paramètres du Club',
    nav_integration: 'Intégration Web',
    nav_logs: 'Journaux d\'Audit',
    btn_verify: 'Vérifier le Certificat',
    btn_visit_club: 'Visiter le Site Officiel du Club',
    btn_download_pdf: 'Télécharger le Certificat PDF',
    btn_copy_link: 'Copier le Lien de Vérification',
    verified_valid: 'VÉRIFIÉ ET VALIDE',
    tamper_detected: 'FALSIFICATION DÉTECTÉE / INVALIDE',
    revoked: 'CERTIFICAT RÉVOQUÉ',
    tamper_match: 'Les données correspondent au registre cryptographique officiel (SHA-256).',
    tamper_warning: 'Attention : les données ne correspondent pas à la signature cryptographique!',
    issued_by: 'Délivré Par',
    issue_date: 'Date de Délivrance',
    cert_number: 'Numéro de Certificat',
    recipient_name: 'Nom du Récipiendaire',
    achievement: 'Reconnaissance / Réalisation',
    status: 'Statut de Validité'
  }
};

let currentLang = 'en';

function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[lang][key]) {
        if (el.tagName === 'INPUT' && el.getAttribute('placeholder')) {
          el.setAttribute('placeholder', translations[lang][key]);
        } else {
          el.textContent = translations[lang][key];
        }
      }
    });
  }
}

function t(key) {
  return (translations[currentLang] && translations[currentLang][key]) || translations['en'][key] || key;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { translations, setLanguage, t };
}
