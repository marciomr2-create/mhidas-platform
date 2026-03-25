import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();

    const connectionId = body.connection_id as string;
    const action = body.action as "accept" | "decline";

    if (!connectionId || !action) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      );
    }

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Ação inválida" },
        { status: 400 }
      );
    }

    // Verifica se a conexão pertence ao usuário (segurança)
    const { data: connection } = await supabase
      .from("professional_connections")
      .select("id, target_user_id, status")
      .eq("id", connectionId)
      .single();

    if (!connection) {
      return NextResponse.json(
        { error: "Conexão não encontrada" },
        { status: 404 }
      );
    }

    if (connection.target_user_id !== user.id) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 }
      );
    }

    if (connection.status !== "pending") {
      return NextResponse.json(
        { error: "Conexão já processada" },
        { status: 400 }
      );
    }

    const newStatus = action === "accept" ? "accepted" : "declined";

    const { error } = await supabase
      .from("professional_connections")
      .update({
        status: newStatus,
        responded_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (error) {
      return NextResponse.json(
        { error: "Erro ao atualizar conexão" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}