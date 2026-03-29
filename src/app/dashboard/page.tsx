import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/utils/supabase/server";

type CardRow = {
  card_id: string;
  user_id?: string | null;
  label: string | null;
  status: string | null;
  slug?: string | null;
  is_published?: boolean | null;
};

type ConnectionStatus = "pending" | "accepted" | "declined" | "cancelled";

type ConnectionRow = {
  id: string;
  requester_user_id: string;
  target_user_id: string;
  status: ConnectionStatus;
  created_at: string | null;
};

type ProfessionalProfileRow = {
  user_id: string;
  profession: string | null;
  company_name: string | null;
  city: string | null;
  ai_summary: string | null;
  bio_text: string | null;
  pro_photo_url: string | null;
};

type OpportunityItem = {
  connection_id: string;
  user_id: string;
  slug: string | null;
  title: string;
  subtitle: string | null;
  city: string | null;
  summary: string;
  pro_photo_url: string | null;
  created_at: string | null;
};

type ActivityItem = {
  id: string;
  kind: "received_pending" | "sent_pending" | "accepted";
  title: string;
  description: string;
  dateLabel: string;
  slug: string | null;
};

type NextStepItem = {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

type ProgressItem = {
  label: string;
  done: boolean;
};

type GamificationItem = {
  title: string;
  description: string;
  points: number;
  level: string;
  nextLevel: string | null;
  pointsToNextLevel: number;
  achievements: string[];
};

type GoalItem = {
  label: string;
  done: boolean;
  actionLabel: string;
  actionHref: string;
};

type GoalSummary = {
  pendingCount: number;
  completedCount: number;
  title: string;
  description: string;
  items: GoalItem[];
};

type NetworkValueSummary = {
  title: string;
  description: string;
  cards: Array<{
    label: string;
    value: number;
    helper: string;
  }>;
  highlights: string[];
};

type ReturnReasonSummary = {
  title: string;
  description: string;
  primaryMessage: string;
  supportMessage: string;
  indicators: Array<{
    label: string;
    value: string;
    helper: string;
  }>;
};

function formatDate(value: string | null): string {
  if (!value) return "Data indisponível";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getOpportunitySummary(profile: ProfessionalProfileRow | undefined): string {
  if (!profile) {
    return "Este profissional ainda está configurando o perfil na plataforma.";
  }

  if (profile.ai_summary?.trim()) return profile.ai_summary.trim();
  if (profile.bio_text?.trim()) return profile.bio_text.trim();

  return "Perfil profissional disponível para contato.";
}

function getDisplayName(
  profile: ProfessionalProfileRow | undefined,
  card: CardRow | undefined
): string {
  return profile?.profession?.trim() || card?.label?.trim() || "Profissional da rede";
}

function buildOpportunityItems(
  connections: ConnectionRow[],
  profileByUserId: Map<string, ProfessionalProfileRow>,
  cardByUserId: Map<string, CardRow>
): OpportunityItem[] {
  return connections.map((connection) => {
    const relatedUserId = connection.requester_user_id;
    const profile = profileByUserId.get(relatedUserId);
    const card = cardByUserId.get(relatedUserId);

    const title = getDisplayName(profile, card);

    const subtitle =
      profile?.company_name?.trim() ||
      (card?.label?.trim() && profile?.profession?.trim() ? card.label : null) ||
      "Perfil em configuração";

    return {
      connection_id: connection.id,
      user_id: relatedUserId,
      slug: card?.slug ?? null,
      title,
      subtitle,
      city: profile?.city ?? null,
      summary: getOpportunitySummary(profile),
      pro_photo_url: profile?.pro_photo_url ?? null,
      created_at: connection.created_at,
    };
  });
}

function buildActivityItems(
  connections: ConnectionRow[],
  currentUserId: string,
  profileByUserId: Map<string, ProfessionalProfileRow>,
  cardByUserId: Map<string, CardRow>
): ActivityItem[] {
  const sorted = connections
    .slice()
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 8);

  return sorted.map((connection) => {
    const otherUserId =
      connection.requester_user_id === currentUserId
        ? connection.target_user_id
        : connection.requester_user_id;

    const otherProfile = profileByUserId.get(otherUserId);
    const otherCard = cardByUserId.get(otherUserId);
    const name = getDisplayName(otherProfile, otherCard);
    const dateLabel = formatDate(connection.created_at);

    if (connection.status === "accepted") {
      return {
        id: connection.id,
        kind: "accepted",
        title: "Conexão confirmada",
        description: `Você agora está conectado com ${name}.`,
        dateLabel,
        slug: otherCard?.slug ?? null,
      };
    }

    if (connection.status === "pending" && connection.target_user_id === currentUserId) {
      return {
        id: connection.id,
        kind: "received_pending",
        title: "Nova solicitação recebida",
        description: `${name} demonstrou interesse em falar com você.`,
        dateLabel,
        slug: otherCard?.slug ?? null,
      };
    }

    return {
      id: connection.id,
      kind: "sent_pending",
      title: "Solicitação enviada",
      description: `Você enviou uma solicitação para ${name}.`,
      dateLabel,
      slug: otherCard?.slug ?? null,
    };
  });
}

function getNextStep(params: {
  cardsCount: number;
  receivedPendingCount: number;
  sentPendingCount: number;
  acceptedCount: number;
  firstOpportunitySlug: string | null;
  firstAcceptedSlug: string | null;
}): NextStepItem {
  const {
    cardsCount,
    receivedPendingCount,
    sentPendingCount,
    acceptedCount,
    firstOpportunitySlug,
    firstAcceptedSlug,
  } = params;

  if (receivedPendingCount > 0) {
    return {
      title: "Você tem pessoas aguardando sua resposta",
      description:
        receivedPendingCount === 1
          ? "Existe 1 nova solicitação de contato esperando sua atenção. Responder agora aumenta a chance de conversa e conexão real."
          : `Existem ${receivedPendingCount} novas solicitações de contato esperando sua atenção. Responder agora aumenta a chance de conversa e conexão real.`,
      primaryLabel: "Revisar contatos agora",
      primaryHref: "/dashboard/network",
      secondaryLabel: firstOpportunitySlug ? "Abrir um perfil recebido" : "Abrir meus contatos",
      secondaryHref: firstOpportunitySlug ? `/${firstOpportunitySlug}?mode=pro` : "/dashboard/network",
    };
  }

  if (acceptedCount > 0) {
    return {
      title: "Sua rede já começou a crescer",
      description:
        acceptedCount === 1
          ? "Você já possui 1 conexão confirmada. O melhor próximo passo é revisar esse perfil e fortalecer a utilidade da sua rede."
          : `Você já possui ${acceptedCount} conexões confirmadas. O melhor próximo passo é revisar esses perfis e fortalecer a utilidade da sua rede.`,
      primaryLabel: "Abrir meus contatos",
      primaryHref: "/dashboard/network",
      secondaryLabel: firstAcceptedSlug ? "Abrir um perfil conectado" : "Abrir meus cards",
      secondaryHref: firstAcceptedSlug ? `/${firstAcceptedSlug}?mode=pro` : "/dashboard/cards",
    };
  }

  if (sentPendingCount > 0) {
    return {
      title: "Você já iniciou movimento na rede",
      description:
        sentPendingCount === 1
          ? "Existe 1 solicitação enviada aguardando retorno. Aproveite este momento para revisar seu perfil e aumentar sua força de apresentação."
          : `Existem ${sentPendingCount} solicitações enviadas aguardando retorno. Aproveite este momento para revisar seu perfil e aumentar sua força de apresentação.`,
      primaryLabel: "Abrir meus contatos",
      primaryHref: "/dashboard/network",
      secondaryLabel: "Abrir meus cards",
      secondaryHref: "/dashboard/cards",
    };
  }

  if (cardsCount > 0) {
    return {
      title: "Seu sistema está pronto para gerar novas conexões",
      description:
        "Você já possui card ativo. O próximo passo é revisar sua apresentação e usar o perfil profissional para atrair novos contatos.",
      primaryLabel: "Abrir meus cards",
      primaryHref: "/dashboard/cards",
      secondaryLabel: "Abrir meus contatos",
      secondaryHref: "/dashboard/network",
    };
  }

  return {
    title: "Comece preparando sua base de presença",
    description:
      "Antes de crescer a rede, o ideal é organizar seu card e sua apresentação. Isso torna a plataforma mais forte quando novos contatos chegarem.",
    primaryLabel: "Abrir meus cards",
    primaryHref: "/dashboard/cards",
    secondaryLabel: "Abrir meus contatos",
    secondaryHref: "/dashboard/network",
  };
}

function calculateProgress(cardsCount: number, connections: ConnectionRow[]) {
  const hasCard = cardsCount > 0;
  const hasAnyConnection = connections.length > 0;
  const hasAccepted = connections.some((c) => c.status === "accepted");
  const hasActivity = connections.length > 0;

  const steps: ProgressItem[] = [
    { label: "Criou seu card", done: hasCard },
    { label: "Iniciou contatos", done: hasAnyConnection },
    { label: "Conexão confirmada", done: hasAccepted },
    { label: "Já teve atividade", done: hasActivity },
  ];

  const completed = steps.filter((step) => step.done).length;
  const percent = Math.round((completed / steps.length) * 100);

  return { steps, percent };
}

function calculateGamification(params: {
  cardsCount: number;
  connections: ConnectionRow[];
  receivedPendingCount: number;
  acceptedCount: number;
}): GamificationItem {
  const { cardsCount, connections, receivedPendingCount, acceptedCount } = params;

  const hasCard = cardsCount > 0;
  const hasConnection = connections.length > 0;
  const hasAccepted = acceptedCount > 0;

  let points = 0;
  const achievements: string[] = [];

  if (hasCard) {
    points += 40;
    achievements.push("Seu card já está ativo");
  }

  if (hasConnection) {
    points += 20;
    achievements.push("Você iniciou movimentação na rede");
  }

  if (hasAccepted) {
    points += 40;
    achievements.push("Você já tem conexão confirmada");
  }

  const acceptedBonus = Math.min(acceptedCount * 10, 30);
  if (acceptedBonus > 0) {
    points += acceptedBonus;
    achievements.push("Suas conexões confirmadas aumentaram sua força na rede");
  }

  const receivedBonus = Math.min(receivedPendingCount * 5, 10);
  if (receivedBonus > 0) {
    points += receivedBonus;
    achievements.push("Seu perfil já está despertando interesse");
  }

  let level = "Começando";
  let nextLevel: string | null = "Em movimento";
  let pointsToNextLevel = Math.max(40 - points, 0);
  let title = "Você já começou sua jornada";
  let description =
    "Seu perfil está nos primeiros passos. Continue avançando para gerar mais presença e mais oportunidades.";

  if (points >= 40 && points <= 79) {
    level = "Em movimento";
    nextLevel = "Ganhando força";
    pointsToNextLevel = Math.max(80 - points, 0);
    title = "Sua rede está em movimento";
    description =
      "Você já deu sinais reais de atividade. O próximo objetivo é fortalecer presença e ganhar mais conexões confirmadas.";
  }

  if (points >= 80 && points <= 119) {
    level = "Ganhando força";
    nextLevel = "Rede ativa";
    pointsToNextLevel = Math.max(120 - points, 0);
    title = "Sua presença está ganhando força";
    description =
      "Você já criou uma base sólida. Agora o sistema começa a transmitir mais valor e mais credibilidade para quem chega ao seu perfil.";
  }

  if (points >= 120) {
    level = "Rede ativa";
    nextLevel = null;
    pointsToNextLevel = 0;
    title = "Sua rede já demonstra tração";
    description =
      "Você já construiu uma base forte de presença e relacionamento. O foco agora é manter ritmo e ampliar o valor percebido.";
  }

  if (achievements.length === 0) {
    achievements.push("Seu próximo marco será ativado quando você começar a usar a rede");
  }

  return {
    title,
    description,
    points,
    level,
    nextLevel,
    pointsToNextLevel,
    achievements,
  };
}

function calculateGoals(params: {
  cardsCount: number;
  sentPendingCount: number;
  receivedPendingCount: number;
  acceptedCount: number;
}): GoalSummary {
  const { cardsCount, sentPendingCount, receivedPendingCount, acceptedCount } = params;

  const items: GoalItem[] = [
    {
      label: "Ter pelo menos 1 card ativo",
      done: cardsCount > 0,
      actionLabel: "Abrir meus cards",
      actionHref: "/dashboard/cards",
    },
    {
      label: "Fazer pelo menos 1 contato",
      done: sentPendingCount > 0 || receivedPendingCount > 0 || acceptedCount > 0,
      actionLabel: "Abrir meus contatos",
      actionHref: "/dashboard/network",
    },
    {
      label: "Conseguir 1 conexão confirmada",
      done: acceptedCount > 0,
      actionLabel: "Ver contatos confirmados",
      actionHref: "/dashboard/network",
    },
  ];

  const pendingCount = items.filter((item) => !item.done).length;
  const completedCount = items.length - pendingCount;

  let title = "Seu perfil já está bem encaminhado";
  let description =
    "Você já concluiu as metas principais desta fase inicial. Continue usando a rede para manter seu perfil forte e ativo.";

  if (pendingCount === 3) {
    title = "Você ainda tem 3 ações importantes para concluir";
    description =
      "Ao concluir essas ações, seu perfil começa a transmitir mais valor e ganha mais utilidade dentro da plataforma.";
  }

  if (pendingCount === 2) {
    title = "Faltam 2 ações para fortalecer sua presença";
    description =
      "Concluir estas próximas ações aumenta sua presença, melhora a percepção de valor e prepara melhor seu perfil para novas conexões.";
  }

  if (pendingCount === 1) {
    title = "Falta 1 ação para completar esta fase";
    description =
      "Você está muito perto de fechar esta etapa. Concluir a última ação deixa seu perfil mais forte para crescer na rede.";
  }

  return {
    pendingCount,
    completedCount,
    title,
    description,
    items,
  };
}

function calculateNetworkValue(params: {
  acceptedCount: number;
  receivedPendingCount: number;
  activityCount: number;
  cardsCount: number;
}): NetworkValueSummary {
  const { acceptedCount, receivedPendingCount, activityCount, cardsCount } = params;

  const cards = [
    {
      label: "Conexões confirmadas",
      value: acceptedCount,
      helper:
        acceptedCount === 0
          ? "Sua rede ainda não confirmou conexões."
          : acceptedCount === 1
          ? "Você já possui 1 relação confirmada."
          : `Você já possui ${acceptedCount} relações confirmadas.`,
    },
    {
      label: "Interesses recebidos",
      value: receivedPendingCount,
      helper:
        receivedPendingCount === 0
          ? "Nenhum novo interesse aguardando resposta."
          : receivedPendingCount === 1
          ? "1 pessoa demonstrou interesse em falar com você."
          : `${receivedPendingCount} pessoas demonstraram interesse em falar com você.`,
    },
    {
      label: "Movimentações recentes",
      value: activityCount,
      helper:
        activityCount === 0
          ? "Sua rede ainda não gerou atividade recente."
          : activityCount === 1
          ? "1 movimentação recente foi registrada."
          : `${activityCount} movimentações recentes foram registradas.`,
    },
    {
      label: "Cards ativos na sua base",
      value: cardsCount,
      helper:
        cardsCount === 0
          ? "Você ainda não tem card ativo."
          : cardsCount === 1
          ? "Você já possui 1 card disponível."
          : `Você já possui ${cardsCount} cards disponíveis.`,
    },
  ];

  const highlights: string[] = [];

  if (acceptedCount > 0) {
    highlights.push("Sua rede já começou a gerar relacionamento confirmado.");
  }

  if (receivedPendingCount > 0) {
    highlights.push("Seu perfil já está despertando interesse de outras pessoas.");
  }

  if (activityCount > 0) {
    highlights.push("A plataforma já registra movimento real ao redor do seu perfil.");
  }

  if (cardsCount > 0) {
    highlights.push("Sua base de presença já está pronta para sustentar novas conexões.");
  }

  let title = "Sua presença ainda está em preparação";
  let description =
    "Neste momento, a plataforma ainda está montando base de relacionamento ao redor do seu perfil.";

  if (acceptedCount > 0 || receivedPendingCount > 0 || activityCount > 0) {
    title = "Sua rede já começou a responder";
    description =
      "Mesmo em fase inicial, sua presença já demonstra sinais de retorno e utilidade prática dentro da plataforma.";
  }

  if (acceptedCount >= 2 || activityCount >= 3) {
    title = "Sua rede já está gerando sinais consistentes";
    description =
      "Você já possui atividade suficiente para mostrar que sua presença não está parada e começa a produzir valor percebido.";
  }

  if (highlights.length === 0) {
    highlights.push("Os primeiros sinais de retorno aparecerão à medida que você usar mais a rede.");
  }

  return {
    title,
    description,
    cards,
    highlights,
  };
}

function calculateReturnReason(params: {
  receivedPendingCount: number;
  acceptedCount: number;
  activityCount: number;
  goalsPendingCount: number;
  gamificationNextLevel: string | null;
  gamificationPointsToNextLevel: number;
}): ReturnReasonSummary {
  const {
    receivedPendingCount,
    acceptedCount,
    activityCount,
    goalsPendingCount,
    gamificationNextLevel,
    gamificationPointsToNextLevel,
  } = params;

  let title = "Volte para acompanhar sua rede";
  let description =
    "Seu painel já mostra sinais suficientes para justificar retornos frequentes e acompanhamento contínuo.";

  let primaryMessage =
    "Mesmo sem novidades imediatas, voltar ao sistema ajuda você a manter presença e perceber oportunidades mais cedo.";

  let supportMessage =
    "Seu melhor uso agora é acompanhar movimento, consolidar relações e manter sua presença ativa.";

  if (receivedPendingCount > 0) {
    primaryMessage =
      receivedPendingCount === 1
        ? "Existe 1 contato aguardando sua resposta. Isso já é um motivo claro para voltar hoje."
        : `Existem ${receivedPendingCount} contatos aguardando sua resposta. Isso já é um motivo claro para voltar hoje.`;

    supportMessage =
      "Quando existem interesses pendentes, retornar rápido aumenta a chance de conversa e fortalece o valor percebido da plataforma.";
  } else if (acceptedCount > 0) {
    primaryMessage =
      acceptedCount === 1
        ? "Sua rede já tem 1 conexão confirmada. Vale voltar para acompanhar e fortalecer esse relacionamento."
        : `Sua rede já tem ${acceptedCount} conexões confirmadas. Vale voltar para acompanhar e fortalecer esses relacionamentos.`;

    supportMessage =
      "Quando a base começa a confirmar conexões, o sistema deixa de ser apenas cadastro e passa a virar acompanhamento de rede.";
  } else if (activityCount > 0) {
    primaryMessage =
      "Sua rede já mostrou movimento. Voltar ao painel ajuda você a acompanhar sinais de interesse e avanço do perfil.";

    supportMessage =
      "Mesmo com atividade inicial, o retorno recorrente melhora sua percepção sobre o que está funcionando.";
  }

  if (goalsPendingCount === 0) {
    description =
      "Você já concluiu a base principal desta fase. Agora o valor está em acompanhar movimento, responder rápido e manter ritmo de uso.";
  }

  const indicators = [
    {
      label: "O que vale acompanhar agora",
      value:
        receivedPendingCount > 0
          ? "Respostas pendentes"
          : acceptedCount > 0
          ? "Relações confirmadas"
          : "Movimento da rede",
      helper:
        receivedPendingCount > 0
          ? "Existem contatos aguardando sua decisão."
          : acceptedCount > 0
          ? "Sua base confirmada já merece acompanhamento."
          : "O foco é acompanhar sinais de uso e crescimento.",
    },
    {
      label: "Próximo ganho possível",
      value:
        gamificationNextLevel && gamificationPointsToNextLevel > 0
          ? `${gamificationPointsToNextLevel} pts`
          : "Nível máximo",
      helper:
        gamificationNextLevel && gamificationPointsToNextLevel > 0
          ? `Faltam ${gamificationPointsToNextLevel} pontos para chegar em ${gamificationNextLevel}.`
          : "Você já alcançou o nível mais alto desta fase inicial.",
    },
    {
      label: "Metas em aberto",
      value: `${goalsPendingCount}`,
      helper:
        goalsPendingCount === 0
          ? "Você concluiu as metas principais desta etapa."
          : goalsPendingCount === 1
          ? "Falta 1 ação importante para fortalecer mais seu perfil."
          : `Faltam ${goalsPendingCount} ações para fortalecer mais seu perfil.`,
    },
  ];

  return {
    title,
    description,
    primaryMessage,
    supportMessage,
    indicators,
  };
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const currentUserId = user.id;

  const { data: cards } = await supabase
    .from("cards")
    .select("card_id,user_id,label,status")
    .eq("user_id", currentUserId)
    .order("issued_at", { ascending: false });

  const { data: connectionRows } = await supabase
    .from("professional_connections")
    .select("id,requester_user_id,target_user_id,status,created_at")
    .or(`requester_user_id.eq.${currentUserId},target_user_id.eq.${currentUserId}`);

  const items = (cards ?? []) as CardRow[];
  const connections = (connectionRows ?? []) as ConnectionRow[];

  const receivedPendingRows = connections.filter(
    (row) => row.target_user_id === currentUserId && row.status === "pending"
  );

  const receivedPendingCount = receivedPendingRows.length;

  const sentPendingCount = connections.filter(
    (row) => row.requester_user_id === currentUserId && row.status === "pending"
  ).length;

  const acceptedRows = connections.filter(
    (row) =>
      row.status === "accepted" &&
      (row.requester_user_id === currentUserId || row.target_user_id === currentUserId)
  );

  const acceptedCount = acceptedRows.length;

  const relatedUserIds = Array.from(
    new Set(
      connections.flatMap((row) => [row.requester_user_id, row.target_user_id]).filter(Boolean)
    )
  ).filter((userId) => userId !== currentUserId);

  let relatedProfiles: ProfessionalProfileRow[] = [];
  let relatedCards: CardRow[] = [];

  if (relatedUserIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("professional_profiles")
      .select("user_id,profession,company_name,city,ai_summary,bio_text,pro_photo_url")
      .in("user_id", relatedUserIds);

    const { data: cardRows } = await supabase
      .from("cards")
      .select("user_id,slug,label,is_published")
      .in("user_id", relatedUserIds)
      .eq("is_published", true);

    relatedProfiles = (profileRows ?? []) as ProfessionalProfileRow[];
    relatedCards = (cardRows ?? []) as CardRow[];
  }

  const profileByUserId = new Map<string, ProfessionalProfileRow>();
  for (const profile of relatedProfiles) {
    profileByUserId.set(profile.user_id, profile);
  }

  const cardByUserId = new Map<string, CardRow>();
  for (const card of relatedCards) {
    if (card.user_id) {
      cardByUserId.set(card.user_id, card);
    }
  }

  const opportunityItems = buildOpportunityItems(
    receivedPendingRows
      .slice()
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      }),
    profileByUserId,
    cardByUserId
  ).slice(0, 3);

  const activityItems = buildActivityItems(
    connections,
    currentUserId,
    profileByUserId,
    cardByUserId
  );

  const firstOpportunitySlug = opportunityItems.find((item) => item.slug)?.slug ?? null;

  const firstAcceptedSlug =
    acceptedRows
      .map((row) => {
        const otherUserId =
          row.requester_user_id === currentUserId ? row.target_user_id : row.requester_user_id;
        return cardByUserId.get(otherUserId)?.slug ?? null;
      })
      .find(Boolean) ?? null;

  const nextStep = getNextStep({
    cardsCount: items.length,
    receivedPendingCount,
    sentPendingCount,
    acceptedCount,
    firstOpportunitySlug,
    firstAcceptedSlug,
  });

  const progress = calculateProgress(items.length, connections);

  const gamification = calculateGamification({
    cardsCount: items.length,
    connections,
    receivedPendingCount,
    acceptedCount,
  });

  const goals = calculateGoals({
    cardsCount: items.length,
    sentPendingCount,
    receivedPendingCount,
    acceptedCount,
  });

  const networkValue = calculateNetworkValue({
    acceptedCount,
    receivedPendingCount,
    activityCount: activityItems.length,
    cardsCount: items.length,
  });

  const returnReason = calculateReturnReason({
    receivedPendingCount,
    acceptedCount,
    activityCount: activityItems.length,
    goalsPendingCount: goals.pendingCount,
    gamificationNextLevel: gamification.nextLevel,
    gamificationPointsToNextLevel: gamification.pointsToNextLevel,
  });

  function pageStyle() {
    return {
      maxWidth: 1100,
      margin: "0 auto",
      padding: 24,
    } as const;
  }

  function gridStyle() {
    return {
      display: "grid",
      gap: 18,
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      marginTop: 24,
    } as const;
  }

  function cardStyle() {
    return {
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 20,
      padding: 20,
      background: "rgba(255,255,255,0.03)",
      display: "grid",
      gap: 14,
    } as const;
  }

  function statBoxStyle(highlight = false) {
    return {
      border: highlight
        ? "1px solid rgba(255,255,255,0.22)"
        : "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16,
      padding: 14,
      background: highlight ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
    } as const;
  }

  function buttonStyle(primary = false) {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "11px 14px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: primary ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
      color: "#fff",
      textDecoration: "none",
      fontWeight: 700,
      width: "fit-content",
    } as const;
  }

  function alertStyle() {
    return {
      marginTop: 20,
      border: "1px solid rgba(255,255,255,0.18)",
      borderRadius: 18,
      padding: 18,
      background: "rgba(255,255,255,0.06)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      flexWrap: "wrap",
    } as const;
  }

  function sectionWrapStyle() {
    return {
      marginTop: 24,
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 20,
      padding: 18,
      background: "rgba(255,255,255,0.03)",
    } as const;
  }

  function opportunityGridStyle() {
    return {
      display: "grid",
      gap: 18,
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      marginTop: 18,
    } as const;
  }

  function badgeStyle() {
    return {
      display: "inline-block",
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.06)",
      fontSize: 12,
      opacity: 0.92,
    } as const;
  }

  function nextStepWrapStyle() {
    return {
      marginTop: 24,
      border: "1px solid rgba(255,255,255,0.16)",
      borderRadius: 22,
      padding: 22,
      background: "rgba(255,255,255,0.05)",
      display: "grid",
      gap: 14,
    } as const;
  }

  function progressBarStyle() {
    return {
      width: "100%",
      height: 10,
      borderRadius: 999,
      background: "rgba(255,255,255,0.08)",
      overflow: "hidden",
    } as const;
  }

  function progressFillStyle() {
    return {
      width: `${progress.percent}%`,
      height: "100%",
      background: "rgba(255,255,255,0.85)",
      transition: "width 0.4s ease",
    } as const;
  }

  function progressStatusStyle(done: boolean) {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      background: done ? "rgba(0,200,120,0.2)" : "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
    } as const;
  }

  function evolutionGridStyle() {
    return {
      display: "grid",
      gap: 18,
      gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
      marginTop: 16,
    } as const;
  }

  function pointsCardStyle() {
    return {
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 18,
      padding: 18,
      background: "rgba(255,255,255,0.04)",
      display: "grid",
      gap: 10,
      alignContent: "start",
    } as const;
  }

  function levelBadgeStyle() {
    return {
      display: "inline-flex",
      alignItems: "center",
      width: "fit-content",
      padding: "7px 12px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(255,255,255,0.07)",
      fontSize: 13,
      fontWeight: 700,
    } as const;
  }

  function achievementItemStyle() {
    return {
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      padding: 12,
      background: "rgba(255,255,255,0.03)",
    } as const;
  }

  function goalsGridStyle() {
    return {
      display: "grid",
      gap: 18,
      gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
      marginTop: 16,
    } as const;
  }

  function goalSummaryCardStyle() {
    return {
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 18,
      padding: 18,
      background: "rgba(255,255,255,0.04)",
      display: "grid",
      gap: 10,
      alignContent: "start",
    } as const;
  }

  function goalItemStyle(done: boolean) {
    return {
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      padding: 14,
      background: done ? "rgba(0,200,120,0.08)" : "rgba(255,255,255,0.03)",
      display: "grid",
      gap: 10,
    } as const;
  }

  function valueGridStyle() {
    return {
      display: "grid",
      gap: 18,
      gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
      marginTop: 16,
    } as const;
  }

  function valueSummaryCardStyle() {
    return {
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 18,
      padding: 18,
      background: "rgba(255,255,255,0.04)",
      display: "grid",
      gap: 10,
      alignContent: "start",
    } as const;
  }

  function valueStatsGridStyle() {
    return {
      display: "grid",
      gap: 10,
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      marginTop: 8,
    } as const;
  }

  function valueStatItemStyle() {
    return {
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      padding: 14,
      background: "rgba(255,255,255,0.03)",
      display: "grid",
      gap: 8,
      alignContent: "start",
    } as const;
  }

  function returnGridStyle() {
    return {
      display: "grid",
      gap: 18,
      gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)",
      marginTop: 16,
    } as const;
  }

  function returnSummaryCardStyle() {
    return {
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 18,
      padding: 18,
      background: "rgba(255,255,255,0.04)",
      display: "grid",
      gap: 12,
      alignContent: "start",
    } as const;
  }

  function returnIndicatorGridStyle() {
    return {
      display: "grid",
      gap: 10,
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      marginTop: 8,
    } as const;
  }

  function returnIndicatorItemStyle() {
    return {
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      padding: 14,
      background: "rgba(255,255,255,0.03)",
      display: "grid",
      gap: 8,
      alignContent: "start",
    } as const;
  }

  function activityBadgeStyle(kind: ActivityItem["kind"]) {
    const label =
      kind === "accepted"
        ? "confirmada"
        : kind === "received_pending"
        ? "recebida"
        : "enviada";

    return <span style={badgeStyle()}>{label}</span>;
  }

  return (
    <main style={pageStyle()}>
      <header style={{ display: "grid", gap: 8 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0 }}>Início</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>Usuário: {user.email}</p>
        <p style={{ margin: 0, opacity: 0.72, maxWidth: 760, lineHeight: 1.6 }}>
          Acompanhe seus cards, veja oportunidades de contato e acesse rapidamente
          as áreas principais da plataforma.
        </p>
      </header>

      <section style={sectionWrapStyle()}>
        <div style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            Seu progresso na plataforma
          </h2>

          <div style={progressBarStyle()}>
            <div style={progressFillStyle()} />
          </div>

          <div style={{ opacity: 0.82, fontSize: 16 }}>
            {progress.percent}% concluído
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
            {progress.steps.map((step, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span>{step.label}</span>
                <span style={progressStatusStyle(step.done)}>
                  {step.done ? "feito" : "pendente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={sectionWrapStyle()}>
        <div style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            Sua evolução na rede
          </h2>
          <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.6 }}>
            Sua pontuação é calculada com base no uso real da plataforma e no avanço
            das suas conexões.
          </p>
        </div>

        <div style={evolutionGridStyle()}>
          <div style={pointsCardStyle()}>
            <div style={{ fontSize: 13, opacity: 0.72, textTransform: "uppercase", letterSpacing: 1 }}>
              Pontuação atual
            </div>

            <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1 }}>
              {gamification.points}
            </div>

            <div style={levelBadgeStyle()}>{gamification.level}</div>

            <div style={{ opacity: 0.88, lineHeight: 1.6 }}>
              {gamification.description}
            </div>

            {gamification.nextLevel ? (
              <div style={{ opacity: 0.74, fontSize: 14, lineHeight: 1.6 }}>
                Faltam {gamification.pointsToNextLevel} pontos para alcançar o nível{" "}
                <strong>{gamification.nextLevel}</strong>.
              </div>
            ) : (
              <div style={{ opacity: 0.74, fontSize: 14, lineHeight: 1.6 }}>
                Você já alcançou o nível mais alto desta fase inicial.
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{gamification.title}</div>
              <p style={{ margin: "8px 0 0 0", opacity: 0.82, lineHeight: 1.6 }}>
                Conquistas identificadas até agora:
              </p>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {gamification.achievements.map((achievement, index) => (
                <div key={index} style={achievementItemStyle()}>
                  {achievement}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={sectionWrapStyle()}>
        <div style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            Metas para fortalecer seu perfil
          </h2>
          <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.6 }}>
            Estas metas mostram o que falta concluir para deixar sua presença mais forte
            e mais útil dentro da plataforma.
          </p>
        </div>

        <div style={goalsGridStyle()}>
          <div style={goalSummaryCardStyle()}>
            <div style={{ fontSize: 13, opacity: 0.72, textTransform: "uppercase", letterSpacing: 1 }}>
              Situação atual
            </div>

            <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.2 }}>
              {goals.pendingCount === 0
                ? "Metas principais concluídas"
                : `${goals.pendingCount} ação${goals.pendingCount > 1 ? "ões" : ""} restante${goals.pendingCount > 1 ? "s" : ""}`}
            </div>

            <div style={{ opacity: 0.86, lineHeight: 1.6 }}>{goals.description}</div>

            <div style={{ opacity: 0.74, fontSize: 14 }}>
              {goals.completedCount} de {goals.items.length} metas concluídas
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{goals.title}</div>

            {goals.items.map((goal, index) => (
              <div key={index} style={goalItemStyle(goal.done)}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{goal.label}</div>
                  <span style={progressStatusStyle(goal.done)}>
                    {goal.done ? "concluído" : "falta concluir"}
                  </span>
                </div>

                <div>
                  <Link href={goal.actionHref} style={buttonStyle(!goal.done)}>
                    {goal.actionLabel}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={sectionWrapStyle()}>
        <div style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            O que sua rede já está gerando para você
          </h2>
          <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.6 }}>
            Esta leitura mostra os sinais de retorno que sua presença já está produzindo
            dentro da plataforma.
          </p>
        </div>

        <div style={valueGridStyle()}>
          <div style={valueSummaryCardStyle()}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{networkValue.title}</div>
            <p style={{ margin: 0, opacity: 0.84, lineHeight: 1.6 }}>
              {networkValue.description}
            </p>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={valueStatsGridStyle()}>
              {networkValue.cards.map((item, index) => (
                <div key={index} style={valueStatItemStyle()}>
                  <div style={{ fontSize: 13, opacity: 0.72 }}>{item.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>
                    {item.value}
                  </div>
                  <div style={{ opacity: 0.82, lineHeight: 1.5 }}>{item.helper}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {networkValue.highlights.map((highlight, index) => (
                <div key={index} style={achievementItemStyle()}>
                  {highlight}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={sectionWrapStyle()}>
        <div style={{ display: "grid", gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>
            {returnReason.title}
          </h2>
          <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.6 }}>
            {returnReason.description}
          </p>
        </div>

        <div style={returnGridStyle()}>
          <div style={returnSummaryCardStyle()}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{returnReason.primaryMessage}</div>
            <p style={{ margin: 0, opacity: 0.84, lineHeight: 1.6 }}>
              {returnReason.supportMessage}
            </p>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              O que acompanhar nas próximas visitas
            </div>

            <div style={returnIndicatorGridStyle()}>
              {returnReason.indicators.map((indicator, index) => (
                <div key={index} style={returnIndicatorItemStyle()}>
                  <div style={{ fontSize: 13, opacity: 0.72 }}>{indicator.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>
                    {indicator.value}
                  </div>
                  <div style={{ opacity: 0.82, lineHeight: 1.5 }}>{indicator.helper}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={nextStepWrapStyle()}>
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 13, opacity: 0.72, textTransform: "uppercase", letterSpacing: 1 }}>
            Próximo passo recomendado
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{nextStep.title}</h2>
          <p style={{ margin: 0, opacity: 0.86, lineHeight: 1.7, maxWidth: 860 }}>
            {nextStep.description}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href={nextStep.primaryHref} style={buttonStyle(true)}>
            {nextStep.primaryLabel}
          </Link>

          <Link href={nextStep.secondaryHref} style={buttonStyle()}>
            {nextStep.secondaryLabel}
          </Link>
        </div>
      </section>

      {receivedPendingCount > 0 ? (
        <section style={alertStyle()}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {receivedPendingCount === 1
                ? "Você recebeu 1 nova oportunidade de contato."
                : `Você recebeu ${receivedPendingCount} novas oportunidades de contato.`}
            </div>
            <p style={{ margin: "8px 0 0 0", opacity: 0.82, lineHeight: 1.6 }}>
              Revise agora quem demonstrou interesse em falar com você.
            </p>
          </div>

          <Link href="/dashboard/network" style={buttonStyle(true)}>
            Revisar agora
          </Link>
        </section>
      ) : null}

      {opportunityItems.length > 0 ? (
        <section style={sectionWrapStyle()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>
                Oportunidades para você revisar agora
              </h2>
              <p style={{ margin: "8px 0 0 0", opacity: 0.78, maxWidth: 760 }}>
                Estas são as solicitações mais recentes recebidas no seu perfil profissional.
              </p>
            </div>

            <Link href="/dashboard/network" style={buttonStyle()}>
              Ver todas
            </Link>
          </div>

          <div style={opportunityGridStyle()}>
            {opportunityItems.map((item) => (
              <article key={item.connection_id} style={cardStyle()}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  {item.pro_photo_url ? (
                    <img
                      src={item.pro_photo_url}
                      alt="Foto profissional"
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 18,
                        objectFit: "cover",
                        border: "1px solid rgba(255,255,255,0.12)",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 18,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.05)",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        opacity: 0.75,
                        flexShrink: 0,
                      }}
                    >
                      PRO
                    </div>
                  )}

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{item.title}</div>

                    {item.subtitle ? <div style={{ opacity: 0.88 }}>{item.subtitle}</div> : null}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {item.city ? <span style={badgeStyle()}>{item.city}</span> : null}
                      <span style={badgeStyle()}>nova solicitação</span>
                    </div>
                  </div>
                </div>

                <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.6 }}>{item.summary}</p>

                <div style={{ fontSize: 13, opacity: 0.72 }}>
                  Recebida em: {formatDate(item.created_at)}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {item.slug ? (
                    <Link href={`/${item.slug}?mode=pro`} style={buttonStyle()}>
                      Abrir perfil
                    </Link>
                  ) : (
                    <span
                      style={{
                        ...buttonStyle(),
                        opacity: 0.55,
                        cursor: "default",
                      }}
                    >
                      Perfil ainda indisponível
                    </span>
                  )}

                  <Link href="/dashboard/network" style={buttonStyle(true)}>
                    Revisar contato
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section style={gridStyle()}>
        <article style={cardStyle()}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Meus cards</h2>
            <p style={{ margin: "8px 0 0 0", opacity: 0.8, lineHeight: 1.6 }}>
              Gerencie seus cards, status, publicação e acesso às páginas individuais.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            }}
          >
            <div style={statBoxStyle()}>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Cards encontrados</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{items.length}</div>
            </div>

            <div style={statBoxStyle()}>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Com acesso rápido</div>
              <div style={{ fontSize: 28, fontWeight: 900 }}>{items.length}</div>
            </div>
          </div>

          <Link href="/dashboard/cards" style={buttonStyle(true)}>
            Abrir meus cards
          </Link>
        </article>

        <article style={cardStyle()}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Contatos profissionais</h2>
            <p style={{ margin: "8px 0 0 0", opacity: 0.8, lineHeight: 1.6 }}>
              Acompanhe solicitações recebidas, enviadas e conexões já confirmadas.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            }}
          >
            <div style={statBoxStyle(receivedPendingCount > 0)}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {receivedPendingCount > 0 ? "Novas" : "Recebidas"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{receivedPendingCount}</div>
            </div>

            <div style={statBoxStyle()}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Enviadas</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{sentPendingCount}</div>
            </div>

            <div style={statBoxStyle()}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Confirmadas</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{acceptedCount}</div>
            </div>
          </div>

          <Link href="/dashboard/network" style={buttonStyle(true)}>
            Abrir meus contatos
          </Link>
        </article>
      </section>

      <section style={sectionWrapStyle()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Atividade recente</h2>
            <p style={{ margin: "8px 0 0 0", opacity: 0.78, maxWidth: 760 }}>
              Veja as movimentações mais recentes da sua rede profissional.
            </p>
          </div>

          <Link href="/dashboard/network" style={buttonStyle()}>
            Abrir meus contatos
          </Link>
        </div>

        {activityItems.length === 0 ? (
          <p style={{ marginTop: 18, opacity: 0.8, lineHeight: 1.6 }}>
            Ainda não há movimentações recentes. Assim que você enviar ou receber contatos,
            esta área começará a mostrar a atividade.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
            {activityItems.map((item) => (
              <article
                key={item.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: 14,
                  background: "rgba(255,255,255,0.03)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{item.title}</div>
                  {activityBadgeStyle(item.kind)}
                </div>

                <div style={{ opacity: 0.9, lineHeight: 1.6 }}>{item.description}</div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontSize: 13, opacity: 0.72 }}>{item.dateLabel}</div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {item.slug ? (
                      <Link href={`/${item.slug}?mode=pro`} style={buttonStyle()}>
                        Abrir perfil
                      </Link>
                    ) : null}

                    <Link href="/dashboard/network" style={buttonStyle(true)}>
                      Ver contatos
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={sectionWrapStyle()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Resumo dos cards</h2>
            <p style={{ margin: "8px 0 0 0", opacity: 0.78 }}>
              Visualização rápida dos cards vinculados à sua conta.
            </p>
          </div>

          <Link href="/dashboard/cards" style={buttonStyle()}>
            Ver todos os cards
          </Link>
        </div>

        {items.length === 0 ? (
          <p style={{ marginTop: 18, opacity: 0.8 }}>Nenhum card encontrado.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 18 }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.8 }}>
                <th style={{ padding: "10px 8px" }}>Label</th>
                <th style={{ padding: "10px 8px" }}>Status</th>
                <th style={{ padding: "10px 8px" }}>Card ID</th>
                <th style={{ padding: "10px 8px" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr
                  key={c.card_id}
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <td style={{ padding: "10px 8px", fontWeight: 700 }}>{c.label ?? "—"}</td>
                  <td style={{ padding: "10px 8px" }}>{c.status ?? "—"}</td>
                  <td style={{ padding: "10px 8px", opacity: 0.9 }}>{c.card_id}</td>
                  <td style={{ padding: "10px 8px" }}>
                    <Link
                      href={`/dashboard/cards/${c.card_id}`}
                      style={{ textDecoration: "underline" }}
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}