import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { paymentKey, orderId, amount } = await req.json();

    if (!paymentKey || !orderId || !amount) {
      return new Response(JSON.stringify({ error: "필수 파라미터 누락" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 토스 시크릿 키 (Supabase Edge Function 환경변수에서 읽음)
    // supabase secrets set TOSS_SECRET_KEY=test_sk_... 명령으로 설정
    const TOSS_SECRET_KEY = Deno.env.get("TOSS_SECRET_KEY") ?? "";

    // 토스 결제 확인 API 호출
    const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(TOSS_SECRET_KEY + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const tossData = await tossRes.json();

    if (!tossRes.ok) {
      // 토스 결제 실패 → 주문 실패 처리
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      );
      await supabase.from("orders").update({ status: "failed" }).eq("toss_order_id", orderId);

      return new Response(JSON.stringify({ error: tossData.message || "결제 확인 실패" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 결제 성공 → DB 업데이트
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 주문 상태 업데이트
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "success", payment_key: paymentKey })
      .eq("toss_order_id", orderId);

    if (orderError) throw orderError;

    // 재고 감소
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("toss_order_id", orderId)
      .single();

    if (order) {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", order.id);

      if (items) {
        for (const item of items) {
          await supabase.rpc("decrement_stock", {
            p_product_id: item.product_id,
            p_qty: item.quantity,
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, paymentKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
