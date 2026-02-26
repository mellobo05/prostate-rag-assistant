import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import type { MedicalReport } from "@shared/schema";

export function PsaChart({ reports }: { reports: MedicalReport[] }) {
  const data = useMemo(() => {
    return reports
      .filter(r => r.reportType === 'PSA' && r.psaLevel)
      .map(r => ({
        date: new Date(r.reportDate).getTime(),
        displayDate: format(new Date(r.reportDate), "MMM yyyy"),
        value: parseFloat(r.psaLevel as string) || 0
      }))
      .sort((a, b) => a.date - b.date);
  }, [reports]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-secondary/30 rounded-2xl border border-dashed border-border">
        <p className="text-muted-foreground text-sm">No PSA data available to chart.</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(185 62% 45%)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(185 62% 45%)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="displayDate" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
          />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
            labelStyle={{ fontWeight: 'bold', color: 'hsl(var(--foreground))' }}
            itemStyle={{ color: 'hsl(var(--primary))' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorValue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
