'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type AppTheme = 'dark' | 'light'
export type AppLanguage = 'en' | 'fr' | 'es' | 'pt' | 'zh' | 'ar'

type PreferencesContextValue = {
  theme: AppTheme
  language: AppLanguage
  setTheme: (theme: AppTheme) => void
  setLanguage: (language: AppLanguage) => void
  t: (key: string) => string
}

export const appLanguages: Array<{ code: AppLanguage; label: string; flag: string }> = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'zh', label: '简体中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
]

const messages: Record<AppLanguage, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Dashboard', 'nav.send': 'Send', 'nav.receive': 'Receive', 'nav.activity': 'Activity',
    'dashboard.welcome': 'Welcome,', 'dashboard.checking': 'Checking system status', 'dashboard.active': 'All systems active',
    'dashboard.unavailable': 'Service status unavailable', 'dashboard.sent': 'Sent', 'dashboard.received': 'Received',
    'dashboard.downloads': 'Downloads', 'dashboard.alerts': 'Alerts', 'dashboard.sendFile': 'Send a File',
    'dashboard.drop': 'Drag & drop or tap to upload', 'dashboard.capacity': 'Up to ~5 TB • Encrypted • Private',
    'dashboard.recent': 'Recent Activity', 'dashboard.viewAll': 'View all', 'dashboard.loading': 'Loading activity…',
    'dashboard.empty': 'Your sent and received files will appear here.', 'dashboard.downloaded': 'Downloaded',
    'upload.title': 'Send a File', 'upload.subtitle': 'Upload any file and get a shareable link', 'upload.secure': 'Secure links',
    'upload.direct': 'Direct storage', 'upload.expiring': 'Auto-expiring', 'upload.drop': 'Drag & drop files here',
    'upload.browse': 'or click to browse', 'upload.capacity': 'Resumable multipart transfers • files up to approximately 5 TB',
    'upload.linkSettings': 'Link settings', 'upload.autoDelete': 'Automatic deletion', 'upload.removal': 'File and transfer record are permanently removed',
    'upload.maxDownloads': 'Max downloads', 'upload.unlimited': 'Unlimited', 'upload.password': 'Password protect',
    'upload.uploading': 'Uploading…', 'upload.send': 'Send file',
    'receive.receiver': 'BoltShare Receiver', 'receive.title': 'Receive a File', 'receive.subtitle': 'Ask the sender for their code or QR',
    'receive.enter': 'Enter code', 'receive.placeholder': 'e.g. ABC12345', 'receive.continue': 'Continue', 'receive.scan': 'Scan QR code',
    'history.activity': 'Activity', 'history.title': 'Transfer history', 'history.total': 'total sent and received files',
    'history.all': 'All', 'history.loading': 'Loading activity…', 'history.empty': 'No transfers yet',
    'history.emptyDescription': 'Your sent and received files will appear here.', 'history.first': 'Send your first file', 'history.expired': 'Expired',
    'settings.title': 'Settings', 'settings.subtitle': 'Personalize BoltShare for your comfort and accessibility.',
    'settings.account': 'Account', 'settings.freePlan': 'Free Plan', 'settings.appearance': 'Appearance',
    'settings.appearanceHelp': 'Choose a comfortable display mode.', 'settings.day': 'Day', 'settings.night': 'Night',
    'settings.language': 'Language', 'settings.languageHelp': 'Use BoltShare in your preferred language.',
    'settings.transfers': 'Transfer defaults', 'settings.expiry': 'Default expiry', 'settings.maxDownloads': 'Default max downloads',
    'settings.unlimited': 'Unlimited', 'settings.hours': 'hours', 'settings.support': 'Support',
    'settings.team': 'Team & organization', 'settings.help': 'Help Center', 'settings.contact': 'Contact Us',
    'settings.about': 'About BoltShare', 'settings.version': 'Version 2.0.0', 'settings.danger': 'Danger zone',
    'settings.delete': 'Delete account', 'settings.deleteDescription': 'Permanently delete your account and all associated data.',
    'settings.deleteList': 'The following will be permanently deleted:', 'settings.delete1': 'Your account and profile',
    'settings.delete2': 'All files you have shared', 'settings.delete3': 'All download logs and analytics',
    'settings.delete4': 'Your organization if you are its sole owner', 'settings.delete5': 'All active share links',
    'settings.typeDelete': 'Type DELETE to confirm', 'settings.cancel': 'Cancel', 'settings.confirmDelete': 'Confirm deletion',
    'settings.deleting': 'Deleting…', 'settings.logout': 'Log out', 'settings.deleteEmail': 'Request account deletion by email',
  },
  fr: {
    'nav.dashboard': 'Tableau', 'nav.send': 'Envoyer', 'nav.receive': 'Recevoir', 'nav.activity': 'Activité',
    'dashboard.welcome': 'Bienvenue,', 'dashboard.checking': 'Vérification du service', 'dashboard.active': 'Tous les systèmes sont actifs',
    'dashboard.unavailable': 'État du service indisponible', 'dashboard.sent': 'Envoyés', 'dashboard.received': 'Reçus',
    'dashboard.downloads': 'Téléchargements', 'dashboard.alerts': 'Alertes', 'dashboard.sendFile': 'Envoyer un fichier',
    'dashboard.drop': 'Glissez-déposez ou touchez pour importer', 'dashboard.capacity': "Jusqu’à ~5 To • Chiffré • Privé",
    'dashboard.recent': 'Activité récente', 'dashboard.viewAll': 'Tout voir', 'dashboard.loading': 'Chargement de l’activité…',
    'dashboard.empty': 'Vos fichiers envoyés et reçus apparaîtront ici.', 'dashboard.downloaded': 'Téléchargé',
    'upload.title': 'Envoyer un fichier', 'upload.subtitle': 'Importez un fichier et obtenez un lien partageable', 'upload.secure': 'Liens sécurisés',
    'upload.direct': 'Stockage direct', 'upload.expiring': 'Expiration auto.', 'upload.drop': 'Glissez-déposez vos fichiers ici',
    'upload.browse': 'ou touchez pour parcourir', 'upload.capacity': "Transferts multiparties • fichiers jusqu’à environ 5 To",
    'upload.linkSettings': 'Paramètres du lien', 'upload.autoDelete': 'Suppression automatique', 'upload.removal': 'Le fichier et le transfert sont supprimés définitivement',
    'upload.maxDownloads': 'Téléchargements max.', 'upload.unlimited': 'Illimité', 'upload.password': 'Protection par mot de passe',
    'upload.uploading': 'Importation…', 'upload.send': 'Envoyer le fichier',
    'receive.receiver': 'Récepteur BoltShare', 'receive.title': 'Recevoir un fichier', 'receive.subtitle': 'Demandez le code ou le QR à l’expéditeur',
    'receive.enter': 'Saisir le code', 'receive.placeholder': 'ex. ABC12345', 'receive.continue': 'Continuer', 'receive.scan': 'Scanner le code QR',
    'history.activity': 'Activité', 'history.title': 'Historique des transferts', 'history.total': 'fichiers envoyés et reçus au total',
    'history.all': 'Tous', 'history.loading': 'Chargement de l’activité…', 'history.empty': 'Aucun transfert',
    'history.emptyDescription': 'Vos fichiers envoyés et reçus apparaîtront ici.', 'history.first': 'Envoyer votre premier fichier', 'history.expired': 'Expiré',
    'settings.title': 'Paramètres', 'settings.subtitle': 'Personnalisez BoltShare pour votre confort et votre accessibilité.',
    'settings.account': 'Compte', 'settings.freePlan': 'Offre gratuite', 'settings.appearance': 'Apparence',
    'settings.appearanceHelp': 'Choisissez un mode d’affichage confortable.', 'settings.day': 'Jour', 'settings.night': 'Nuit',
    'settings.language': 'Langue', 'settings.languageHelp': 'Utilisez BoltShare dans votre langue préférée.',
    'settings.transfers': 'Valeurs de transfert', 'settings.expiry': 'Expiration par défaut', 'settings.maxDownloads': 'Téléchargements max.',
    'settings.unlimited': 'Illimité', 'settings.hours': 'heures', 'settings.support': 'Assistance',
    'settings.team': 'Équipe et organisation', 'settings.help': "Centre d’aide", 'settings.contact': 'Nous contacter',
    'settings.about': 'À propos de BoltShare', 'settings.version': 'Version 2.0.0', 'settings.danger': 'Zone dangereuse',
    'settings.delete': 'Supprimer le compte', 'settings.deleteDescription': 'Supprimez définitivement votre compte et toutes les données associées.',
    'settings.deleteList': 'Les éléments suivants seront supprimés :', 'settings.delete1': 'Votre compte et votre profil',
    'settings.delete2': 'Tous vos fichiers partagés', 'settings.delete3': 'Tous les journaux et analyses',
    'settings.delete4': 'Votre organisation si vous en êtes l’unique propriétaire', 'settings.delete5': 'Tous les liens de partage actifs',
    'settings.typeDelete': 'Tapez DELETE pour confirmer', 'settings.cancel': 'Annuler', 'settings.confirmDelete': 'Confirmer',
    'settings.deleting': 'Suppression…', 'settings.logout': 'Se déconnecter', 'settings.deleteEmail': 'Demander la suppression par e-mail',
  },
  es: {
    'nav.dashboard': 'Inicio', 'nav.send': 'Enviar', 'nav.receive': 'Recibir', 'nav.activity': 'Actividad',
    'dashboard.welcome': 'Bienvenido,', 'dashboard.checking': 'Comprobando el servicio', 'dashboard.active': 'Todos los sistemas activos',
    'dashboard.unavailable': 'Estado del servicio no disponible', 'dashboard.sent': 'Enviados', 'dashboard.received': 'Recibidos',
    'dashboard.downloads': 'Descargas', 'dashboard.alerts': 'Alertas', 'dashboard.sendFile': 'Enviar un archivo',
    'dashboard.drop': 'Arrastra o toca para subir', 'dashboard.capacity': 'Hasta ~5 TB • Cifrado • Privado',
    'dashboard.recent': 'Actividad reciente', 'dashboard.viewAll': 'Ver todo', 'dashboard.loading': 'Cargando actividad…',
    'dashboard.empty': 'Tus archivos enviados y recibidos aparecerán aquí.', 'dashboard.downloaded': 'Descargado',
    'upload.title': 'Enviar un archivo', 'upload.subtitle': 'Sube cualquier archivo y obtén un enlace para compartir', 'upload.secure': 'Enlaces seguros',
    'upload.direct': 'Almacenamiento directo', 'upload.expiring': 'Caducidad automática', 'upload.drop': 'Arrastra los archivos aquí',
    'upload.browse': 'o toca para buscar', 'upload.capacity': 'Transferencias multiparte • archivos de hasta aproximadamente 5 TB',
    'upload.linkSettings': 'Configuración del enlace', 'upload.autoDelete': 'Eliminación automática', 'upload.removal': 'El archivo y el registro se eliminan permanentemente',
    'upload.maxDownloads': 'Descargas máximas', 'upload.unlimited': 'Ilimitadas', 'upload.password': 'Proteger con contraseña',
    'upload.uploading': 'Subiendo…', 'upload.send': 'Enviar archivo',
    'receive.receiver': 'Receptor BoltShare', 'receive.title': 'Recibir un archivo', 'receive.subtitle': 'Pide al remitente su código o QR',
    'receive.enter': 'Introduce el código', 'receive.placeholder': 'p. ej. ABC12345', 'receive.continue': 'Continuar', 'receive.scan': 'Escanear código QR',
    'history.activity': 'Actividad', 'history.title': 'Historial de transferencias', 'history.total': 'archivos enviados y recibidos en total',
    'history.all': 'Todos', 'history.loading': 'Cargando actividad…', 'history.empty': 'Todavía no hay transferencias',
    'history.emptyDescription': 'Tus archivos enviados y recibidos aparecerán aquí.', 'history.first': 'Envía tu primer archivo', 'history.expired': 'Caducado',
    'settings.title': 'Configuración', 'settings.subtitle': 'Personaliza BoltShare para tu comodidad y accesibilidad.',
    'settings.account': 'Cuenta', 'settings.freePlan': 'Plan gratuito', 'settings.appearance': 'Apariencia',
    'settings.appearanceHelp': 'Elige un modo de visualización cómodo.', 'settings.day': 'Día', 'settings.night': 'Noche',
    'settings.language': 'Idioma', 'settings.languageHelp': 'Usa BoltShare en tu idioma preferido.',
    'settings.transfers': 'Valores de transferencia', 'settings.expiry': 'Caducidad predeterminada', 'settings.maxDownloads': 'Descargas máximas',
    'settings.unlimited': 'Ilimitadas', 'settings.hours': 'horas', 'settings.support': 'Soporte',
    'settings.team': 'Equipo y organización', 'settings.help': 'Centro de ayuda', 'settings.contact': 'Contáctanos',
    'settings.about': 'Acerca de BoltShare', 'settings.version': 'Versión 2.0.0', 'settings.danger': 'Zona peligrosa',
    'settings.delete': 'Eliminar cuenta', 'settings.deleteDescription': 'Elimina permanentemente tu cuenta y todos los datos asociados.',
    'settings.deleteList': 'Se eliminará permanentemente:', 'settings.delete1': 'Tu cuenta y perfil',
    'settings.delete2': 'Todos los archivos compartidos', 'settings.delete3': 'Todos los registros y análisis',
    'settings.delete4': 'Tu organización si eres el único propietario', 'settings.delete5': 'Todos los enlaces activos',
    'settings.typeDelete': 'Escribe DELETE para confirmar', 'settings.cancel': 'Cancelar', 'settings.confirmDelete': 'Confirmar',
    'settings.deleting': 'Eliminando…', 'settings.logout': 'Cerrar sesión', 'settings.deleteEmail': 'Solicitar eliminación por correo',
  },
  pt: {
    'nav.dashboard': 'Início', 'nav.send': 'Enviar', 'nav.receive': 'Receber', 'nav.activity': 'Atividade',
    'dashboard.welcome': 'Bem-vindo,', 'dashboard.checking': 'Verificando o serviço', 'dashboard.active': 'Todos os sistemas ativos',
    'dashboard.unavailable': 'Status do serviço indisponível', 'dashboard.sent': 'Enviados', 'dashboard.received': 'Recebidos',
    'dashboard.downloads': 'Downloads', 'dashboard.alerts': 'Alertas', 'dashboard.sendFile': 'Enviar um arquivo',
    'dashboard.drop': 'Arraste ou toque para enviar', 'dashboard.capacity': 'Até ~5 TB • Criptografado • Privado',
    'dashboard.recent': 'Atividade recente', 'dashboard.viewAll': 'Ver tudo', 'dashboard.loading': 'Carregando atividade…',
    'dashboard.empty': 'Seus arquivos enviados e recebidos aparecerão aqui.', 'dashboard.downloaded': 'Baixado',
    'upload.title': 'Enviar um arquivo', 'upload.subtitle': 'Envie qualquer arquivo e obtenha um link compartilhável', 'upload.secure': 'Links seguros',
    'upload.direct': 'Armazenamento direto', 'upload.expiring': 'Expiração automática', 'upload.drop': 'Arraste os arquivos aqui',
    'upload.browse': 'ou toque para procurar', 'upload.capacity': 'Transferências multipartes • arquivos de até aproximadamente 5 TB',
    'upload.linkSettings': 'Configurações do link', 'upload.autoDelete': 'Exclusão automática', 'upload.removal': 'O arquivo e o registro são removidos permanentemente',
    'upload.maxDownloads': 'Máximo de downloads', 'upload.unlimited': 'Ilimitado', 'upload.password': 'Proteger com senha',
    'upload.uploading': 'Enviando…', 'upload.send': 'Enviar arquivo',
    'receive.receiver': 'Receptor BoltShare', 'receive.title': 'Receber um arquivo', 'receive.subtitle': 'Peça o código ou QR ao remetente',
    'receive.enter': 'Digite o código', 'receive.placeholder': 'ex. ABC12345', 'receive.continue': 'Continuar', 'receive.scan': 'Escanear código QR',
    'history.activity': 'Atividade', 'history.title': 'Histórico de transferências', 'history.total': 'arquivos enviados e recebidos no total',
    'history.all': 'Todos', 'history.loading': 'Carregando atividade…', 'history.empty': 'Nenhuma transferência ainda',
    'history.emptyDescription': 'Seus arquivos enviados e recebidos aparecerão aqui.', 'history.first': 'Envie seu primeiro arquivo', 'history.expired': 'Expirado',
    'settings.title': 'Configurações', 'settings.subtitle': 'Personalize o BoltShare para seu conforto e acessibilidade.',
    'settings.account': 'Conta', 'settings.freePlan': 'Plano gratuito', 'settings.appearance': 'Aparência',
    'settings.appearanceHelp': 'Escolha um modo de exibição confortável.', 'settings.day': 'Dia', 'settings.night': 'Noite',
    'settings.language': 'Idioma', 'settings.languageHelp': 'Use o BoltShare no idioma de sua preferência.',
    'settings.transfers': 'Padrões de transferência', 'settings.expiry': 'Expiração padrão', 'settings.maxDownloads': 'Máximo de downloads',
    'settings.unlimited': 'Ilimitado', 'settings.hours': 'horas', 'settings.support': 'Suporte',
    'settings.team': 'Equipe e organização', 'settings.help': 'Central de ajuda', 'settings.contact': 'Fale conosco',
    'settings.about': 'Sobre o BoltShare', 'settings.version': 'Versão 2.0.0', 'settings.danger': 'Zona de perigo',
    'settings.delete': 'Excluir conta', 'settings.deleteDescription': 'Exclua permanentemente sua conta e todos os dados associados.',
    'settings.deleteList': 'Os seguintes itens serão excluídos:', 'settings.delete1': 'Sua conta e perfil',
    'settings.delete2': 'Todos os arquivos compartilhados', 'settings.delete3': 'Todos os registros e análises',
    'settings.delete4': 'Sua organização se você for o único proprietário', 'settings.delete5': 'Todos os links ativos',
    'settings.typeDelete': 'Digite DELETE para confirmar', 'settings.cancel': 'Cancelar', 'settings.confirmDelete': 'Confirmar',
    'settings.deleting': 'Excluindo…', 'settings.logout': 'Sair', 'settings.deleteEmail': 'Solicitar exclusão por e-mail',
  },
  zh: {
    'nav.dashboard': '仪表盘', 'nav.send': '发送', 'nav.receive': '接收', 'nav.activity': '活动',
    'dashboard.welcome': '欢迎，', 'dashboard.checking': '正在检查系统状态', 'dashboard.active': '所有系统运行正常',
    'dashboard.unavailable': '无法获取服务状态', 'dashboard.sent': '已发送', 'dashboard.received': '已接收',
    'dashboard.downloads': '下载次数', 'dashboard.alerts': '提醒', 'dashboard.sendFile': '发送文件',
    'dashboard.drop': '拖放或点击以上传', 'dashboard.capacity': '最大约 5 TB • 加密 • 私密',
    'dashboard.recent': '最近活动', 'dashboard.viewAll': '查看全部', 'dashboard.loading': '正在加载活动…',
    'dashboard.empty': '您发送和接收的文件将显示在这里。', 'dashboard.downloaded': '已下载',
    'upload.title': '发送文件', 'upload.subtitle': '上传任意文件并获取分享链接', 'upload.secure': '安全链接',
    'upload.direct': '直连存储', 'upload.expiring': '自动过期', 'upload.drop': '将文件拖放到此处',
    'upload.browse': '或点击浏览', 'upload.capacity': '可续传分片传输 • 文件最大约 5 TB',
    'upload.linkSettings': '链接设置', 'upload.autoDelete': '自动删除', 'upload.removal': '文件和传输记录将被永久删除',
    'upload.maxDownloads': '最大下载次数', 'upload.unlimited': '不限', 'upload.password': '密码保护',
    'upload.uploading': '正在上传…', 'upload.send': '发送文件',
    'receive.receiver': 'BoltShare 接收端', 'receive.title': '接收文件', 'receive.subtitle': '向发送者索取代码或二维码',
    'receive.enter': '输入代码', 'receive.placeholder': '例如 ABC12345', 'receive.continue': '继续', 'receive.scan': '扫描二维码',
    'history.activity': '活动', 'history.title': '传输历史', 'history.total': '个已发送和接收的文件',
    'history.all': '全部', 'history.loading': '正在加载活动…', 'history.empty': '暂无传输',
    'history.emptyDescription': '您发送和接收的文件将显示在这里。', 'history.first': '发送第一个文件', 'history.expired': '已过期',
    'settings.title': '设置', 'settings.subtitle': '个性化 BoltShare，提升舒适性和无障碍体验。',
    'settings.account': '账户', 'settings.freePlan': '免费方案', 'settings.appearance': '外观',
    'settings.appearanceHelp': '选择舒适的显示模式。', 'settings.day': '日间', 'settings.night': '夜间',
    'settings.language': '语言', 'settings.languageHelp': '使用您偏好的语言。',
    'settings.transfers': '传输默认设置', 'settings.expiry': '默认过期时间', 'settings.maxDownloads': '默认最大下载次数',
    'settings.unlimited': '不限', 'settings.hours': '小时', 'settings.support': '支持',
    'settings.team': '团队与组织', 'settings.help': '帮助中心', 'settings.contact': '联系我们',
    'settings.about': '关于 BoltShare', 'settings.version': '版本 2.0.0', 'settings.danger': '危险区域',
    'settings.delete': '删除账户', 'settings.deleteDescription': '永久删除您的账户及所有相关数据。',
    'settings.deleteList': '以下内容将被永久删除：', 'settings.delete1': '您的账户和个人资料',
    'settings.delete2': '您分享的所有文件', 'settings.delete3': '所有下载日志和分析数据',
    'settings.delete4': '若您是唯一所有者，您的组织', 'settings.delete5': '所有有效分享链接',
    'settings.typeDelete': '输入 DELETE 以确认', 'settings.cancel': '取消', 'settings.confirmDelete': '确认删除',
    'settings.deleting': '正在删除…', 'settings.logout': '退出登录', 'settings.deleteEmail': '通过电子邮件申请删除账户',
  },
  ar: {
    'nav.dashboard': 'لوحة التحكم', 'nav.send': 'إرسال', 'nav.receive': 'استلام', 'nav.activity': 'النشاط',
    'dashboard.welcome': 'مرحبًا،', 'dashboard.checking': 'جارٍ التحقق من حالة النظام', 'dashboard.active': 'جميع الأنظمة تعمل',
    'dashboard.unavailable': 'حالة الخدمة غير متاحة', 'dashboard.sent': 'المرسلة', 'dashboard.received': 'المستلمة',
    'dashboard.downloads': 'التنزيلات', 'dashboard.alerts': 'التنبيهات', 'dashboard.sendFile': 'إرسال ملف',
    'dashboard.drop': 'اسحب وأفلت أو اضغط للرفع', 'dashboard.capacity': 'حتى نحو 5 تيرابايت • مشفّر • خاص',
    'dashboard.recent': 'النشاط الأخير', 'dashboard.viewAll': 'عرض الكل', 'dashboard.loading': 'جارٍ تحميل النشاط…',
    'dashboard.empty': 'ستظهر الملفات المرسلة والمستلمة هنا.', 'dashboard.downloaded': 'تم التنزيل',
    'upload.title': 'إرسال ملف', 'upload.subtitle': 'ارفع أي ملف واحصل على رابط قابل للمشاركة', 'upload.secure': 'روابط آمنة',
    'upload.direct': 'تخزين مباشر', 'upload.expiring': 'انتهاء تلقائي', 'upload.drop': 'اسحب الملفات وأفلتها هنا',
    'upload.browse': 'أو اضغط للتصفح', 'upload.capacity': 'نقل متعدد الأجزاء قابل للاستئناف • ملفات حتى نحو 5 تيرابايت',
    'upload.linkSettings': 'إعدادات الرابط', 'upload.autoDelete': 'حذف تلقائي', 'upload.removal': 'سيُحذف الملف وسجل النقل نهائيًا',
    'upload.maxDownloads': 'الحد الأقصى للتنزيلات', 'upload.unlimited': 'غير محدود', 'upload.password': 'حماية بكلمة مرور',
    'upload.uploading': 'جارٍ الرفع…', 'upload.send': 'إرسال الملف',
    'receive.receiver': 'مستقبِل BoltShare', 'receive.title': 'استلام ملف', 'receive.subtitle': 'اطلب من المرسل الرمز أو رمز QR',
    'receive.enter': 'أدخل الرمز', 'receive.placeholder': 'مثال ABC12345', 'receive.continue': 'متابعة', 'receive.scan': 'مسح رمز QR',
    'history.activity': 'النشاط', 'history.title': 'سجل عمليات النقل', 'history.total': 'من الملفات المرسلة والمستلمة',
    'history.all': 'الكل', 'history.loading': 'جارٍ تحميل النشاط…', 'history.empty': 'لا توجد عمليات نقل بعد',
    'history.emptyDescription': 'ستظهر الملفات المرسلة والمستلمة هنا.', 'history.first': 'أرسل ملفك الأول', 'history.expired': 'منتهي الصلاحية',
    'settings.title': 'الإعدادات', 'settings.subtitle': 'خصّص BoltShare لراحتك وسهولة الوصول.',
    'settings.account': 'الحساب', 'settings.freePlan': 'الخطة المجانية', 'settings.appearance': 'المظهر',
    'settings.appearanceHelp': 'اختر وضع عرض مريحًا.', 'settings.day': 'نهاري', 'settings.night': 'ليلي',
    'settings.language': 'اللغة', 'settings.languageHelp': 'استخدم BoltShare بلغتك المفضلة.',
    'settings.transfers': 'إعدادات النقل الافتراضية', 'settings.expiry': 'مدة الانتهاء الافتراضية', 'settings.maxDownloads': 'الحد الأقصى الافتراضي للتنزيلات',
    'settings.unlimited': 'غير محدود', 'settings.hours': 'ساعات', 'settings.support': 'الدعم',
    'settings.team': 'الفريق والمؤسسة', 'settings.help': 'مركز المساعدة', 'settings.contact': 'تواصل معنا',
    'settings.about': 'حول BoltShare', 'settings.version': 'الإصدار 2.0.0', 'settings.danger': 'منطقة الخطر',
    'settings.delete': 'حذف الحساب', 'settings.deleteDescription': 'احذف حسابك وجميع البيانات المرتبطة به نهائيًا.',
    'settings.deleteList': 'سيتم حذف ما يلي نهائيًا:', 'settings.delete1': 'حسابك وملفك الشخصي',
    'settings.delete2': 'جميع الملفات التي شاركتها', 'settings.delete3': 'جميع سجلات التنزيل والتحليلات',
    'settings.delete4': 'مؤسستك إذا كنت مالكها الوحيد', 'settings.delete5': 'جميع روابط المشاركة النشطة',
    'settings.typeDelete': 'اكتب DELETE للتأكيد', 'settings.cancel': 'إلغاء', 'settings.confirmDelete': 'تأكيد الحذف',
    'settings.deleting': 'جارٍ الحذف…', 'settings.logout': 'تسجيل الخروج', 'settings.deleteEmail': 'طلب حذف الحساب عبر البريد الإلكتروني',
  },
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)
const THEME_KEY = 'boltshare_theme_v1'
const LANGUAGE_KEY = 'boltshare_language_v1'

function preferredLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'en'
  const match = appLanguages.find(item => navigator.language.toLowerCase().startsWith(item.code))
  return match?.code ?? 'en'
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('dark')
  const [language, setLanguageState] = useState<AppLanguage>('en')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedTheme = window.localStorage.getItem(THEME_KEY)
        const savedLanguage = window.localStorage.getItem(LANGUAGE_KEY)
        const systemTheme: AppTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
        setThemeState(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : systemTheme)
        setLanguageState(appLanguages.some(item => item.code === savedLanguage) ? savedLanguage as AppLanguage : preferredLanguage())
      } catch {
        setLanguageState(preferredLanguage())
      }
      setReady(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
    if (!ready) return
    try { window.localStorage.setItem(THEME_KEY, theme) } catch {}
  }, [ready, theme, language])

  useEffect(() => {
    if (!ready) return
    try { window.localStorage.setItem(LANGUAGE_KEY, language) } catch {}
  }, [language, ready])

  const value = useMemo<PreferencesContextValue>(() => ({
    theme,
    language,
    setTheme: setThemeState,
    setLanguage: setLanguageState,
    t: key => messages[language][key] ?? messages.en[key] ?? key,
  }), [language, theme])

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider')
  return context
}
