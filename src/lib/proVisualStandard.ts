// src/lib/proVisualStandard.ts
// v4.5.5-pro-visual-standard
// Fonte de referência visual para telas Pro. Não aplicar ao Club.

export const PRO_VISUAL_STANDARD_VERSION = "v4.5.5-pro-visual-standard" as const;

export const proVisualStandard = {
  principle:
    "Perfil Pro como cartão profissional vivo: mobile-first, confiável, direto e premium.",

  colors: {
    pageBackground: "#020617",
    panelBackground: "rgba(15, 23, 42, 0.88)",
    panelBackgroundStrong: "rgba(15, 23, 42, 0.96)",
    cardGradient:
      "linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(17,24,39,0.94) 48%, rgba(30,41,95,0.82) 100%)",
    cardGradientCyan:
      "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(8,47,73,0.64), rgba(30,41,95,0.80))",
    border: "rgba(148, 163, 184, 0.22)",
    borderStrong: "rgba(96, 165, 250, 0.36)",
    text: "#F8FAFC",
    textSecondary: "#CBD5E1",
    textMuted: "#94A3B8",
    accentBlue: "#93C5FD",
    accentCyan: "#67E8F9",
    successText: "#A7F3D0",
    successBorder: "rgba(45, 212, 191, 0.36)",
  },

  radius: {
    button: 14,
    card: 24,
    hero: 28,
    photo: 22,
  },

  shadow: {
    card: "0 24px 70px rgba(2,6,23,0.42)",
    soft: "0 16px 40px rgba(2,6,23,0.24)",
    action: "0 14px 26px rgba(37,99,235,0.16)",
  },

  layout: {
    publicProfileMaxWidth: 1080,
    mobileReferenceWidthMin: 390,
    mobileReferenceWidthMax: 430,
    desktopPadding: 24,
    mobilePadding: 12,
    cardGap: 18,
  },

  typography: {
    kicker: {
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    profileNameMobile: {
      fontSize: 24,
      fontWeight: 950,
      lineHeight: 1.1,
    },
    profileNameDesktop: {
      fontSize: 34,
      fontWeight: 950,
      lineHeight: 1.05,
    },
    bodyMobile: {
      fontSize: 15,
      lineHeight: 1.55,
    },
    bodyDesktop: {
      fontSize: 16,
      lineHeight: 1.65,
    },
  },

  buttons: {
    minHeightMobile: 40,
    minHeightDesktop: 38,
    borderRadius: 14,
    fontWeight: 900,
    primaryGradient:
      "linear-gradient(135deg, rgba(37,99,235,0.92), rgba(79,70,229,0.72))",
    secondaryBackground: "rgba(15,23,42,0.76)",
    successBackground:
      "linear-gradient(135deg, rgba(13,148,136,0.24), rgba(15,23,42,0.78))",
  },

  publicRules: {
    showPublicFollowerCounts: false,
    showPublicFollowingCounts: false,
    showPublicRawConnectionCount: false,
    allowFollowButton: true,
    allowConnectButton: true,
    keepWhatsAppSinglePrimaryAction: true,
  },

  channelRules: {
    useOfficialBrandIconsOnly: true,
    allowGenericEmailIcon: false,
    allowGenericWebsiteIcon: false,
    labelInstagramBusinessAs: "Instagram profissional",
    sectionTitle: "Canais principais",
    sectionDescription: "Links oficiais e caminhos diretos para continuar a conversa.",
  },

  applicationOrder: [
    "src/app/pro/[slug]/page.tsx",
    "src/app/network/page.tsx",
    "src/app/dashboard/network/page.tsx",
    "src/app/dashboard/cards/[card_id]/pro/page.tsx",
  ],
} as const;
