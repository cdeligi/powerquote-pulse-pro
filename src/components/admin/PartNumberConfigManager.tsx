import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { productDataService } from "@/services/productDataService";
import { Level2Product, Level3Product } from "@/types/product";
import { useToast } from "@/hooks/use-toast";

type CodeTemplate = {
  template?: string;
  slot_span?: number;
  is_standard?: boolean;
  standard_position?: number | null;
  designated_only?: boolean;
  designated_positions?: number[];
  designated_positions_str?: string; // UI helper
  outside_chassis?: boolean;
  notes?: string | null;
};

type PartNumberConfigManagerProps = { initialSelectedL2?: string };
const PartNumberConfigManager: React.FC<PartNumberConfigManagerProps> = ({ initialSelectedL2 }) => {
  const { toast } = useToast();
  const [level2List, setLevel2List] = useState<Level2Product[]>([]);
  const [selectedL2, setSelectedL2] = useState<string>(initialSelectedL2 || "");
  const [level3List, setLevel3List] = useState<Level3Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Level 2 config state
  const [prefix, setPrefix] = useState("");
  const [slotPlaceholder, setSlotPlaceholder] = useState("0");
  const [slotCount, setSlotCount] = useState<number>(0);
  const [suffixSeparator, setSuffixSeparator] = useState("-");
  const [remoteOffCode, setRemoteOffCode] = useState("0");
  const [remoteOnCode, setRemoteOnCode] = useState("D1");

  // Level 3 code templates
  const [templates, setTemplates] = useState<Record<string, CodeTemplate>>({});

  useEffect(() => {
    (async () => {
      const l2 = await productDataService.getLevel2Products();
      setLevel2List(l2);
    })();
  }, []);

  // Update selection when a new initial value is provided
  useEffect(() => {
    if (initialSelectedL2) setSelectedL2(initialSelectedL2);
  }, [initialSelectedL2]);

  useEffect(() => {
    if (!selectedL2) return;
    setLoading(true);
    (async () => {
      try {
        const [cfg, l3, codes] = await Promise.all([
          productDataService.getPartNumberConfig(selectedL2),
          productDataService.getLevel3ProductsForLevel2(selectedL2),
          productDataService.getPartNumberCodesForLevel2(selectedL2)
        ]);
        setLevel3List(l3);
        if (cfg) {
          setPrefix(cfg.prefix || "");
          setSlotPlaceholder(cfg.slot_placeholder || "0");
          setSlotCount(cfg.slot_count || 0);
          setSuffixSeparator(cfg.suffix_separator || "-");
          setRemoteOffCode(cfg.remote_off_code || "0");
          setRemoteOnCode(cfg.remote_on_code || "D1");
        } else {
          // Defaults from L2 specs
          const current = level2List.find(p => p.id === selectedL2);
          setPrefix(current?.chassisType || "");
          setSlotCount((current?.specifications as any)?.slots || 0);
        }
        setTemplates(codes);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedL2]);

  const l2 = useMemo(() => level2List.find(p => p.id === selectedL2), [level2List, selectedL2]);

  const saveConfig = async () => {
    try {
      if (!selectedL2) return;
      const okCfg = await productDataService.upsertPartNumberConfig({
        level2_product_id: selectedL2,
        prefix,
        slot_placeholder: slotPlaceholder,
        slot_count: slotCount,
        suffix_separator: suffixSeparator,
        remote_off_code: remoteOffCode,
        remote_on_code: remoteOnCode
      });
      const codesPayload = level3List.map(l3 => {
        const t = templates[l3.id] || {};
        const designated = (t.designated_positions_str !== undefined)
          ? (t.designated_positions_str || '')
              .split(',')
              .map(s => parseInt(s.trim()))
              .filter(n => !isNaN(n))
          : (t.designated_positions || []);
        return {
          level3_product_id: l3.id,
          level2_product_id: selectedL2,
          template: t.template || "X",
          slot_span: t.slot_span || (l3.specifications?.slotRequirement as any) || 1,
          is_standard: !!t.is_standard,
          standard_position: t.standard_position ?? null,
          designated_only: !!t.designated_only,
          designated_positions: designated,
          outside_chassis: !!t.outside_chassis,
          notes: t.notes ?? null,
        };
      });
      await productDataService.upsertPartNumberCodes(codesPayload);
      toast({ title: "Saved", description: "Part number configuration updated" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to save part number configuration", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Part Number Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <Label className="mb-2 block">Select Level 2 (Chassis)</Label>
            <Select value={selectedL2} onValueChange={setSelectedL2}>
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Choose chassis" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border">
                {level2List.map(l2 => (
                  <SelectItem key={l2.id} value={l2.id} className="text-foreground">
                    {l2.name} ({l2.chassisType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <Label>Prefix</Label>
              <Input value={prefix} onChange={e => setPrefix(e.target.value)} className="bg-background border-border text-foreground" />
            </div>
            <div>
              <Label>Slot Placeholder</Label>
              <Input value={slotPlaceholder} onChange={e => setSlotPlaceholder(e.target.value)} className="bg-background border-border text-foreground" />
            </div>
            <div>
              <Label>Slot Count</Label>
              <Input type="number" value={slotCount} onChange={e => setSlotCount(parseInt(e.target.value) || 0)} className="bg-background border-border text-foreground" />
            </div>
            <div>
              <Label>Suffix Separator</Label>
              <Input value={suffixSeparator} onChange={e => setSuffixSeparator(e.target.value)} className="bg-background border-border text-foreground" />
            </div>
            <div>
              <Label>Remote Off Code</Label>
              <Input value={remoteOffCode} onChange={e => setRemoteOffCode(e.target.value)} className="bg-background border-border text-foreground" />
            </div>
            <div>
              <Label>Remote On Code</Label>
              <Input value={remoteOnCode} onChange={e => setRemoteOnCode(e.target.value)} className="bg-background border-border text-foreground" />
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <div className="mb-3 flex items-center justify-between">
            <Label>Level 3 Codes for: {l2?.name || "—"}</Label>
            <Button size="sm" variant="outline" onClick={saveConfig} disabled={!selectedL2 || loading}>Save</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {level3List.map(l3 => (
              <div key={l3.id} className="p-3 rounded-md border border-border bg-background/50 space-y-2">
                <div className="text-sm font-medium mb-2">{l3.name}</div>
                <div className="grid grid-cols-5 gap-2 items-center">
                  <div className="col-span-3">
                    <Label className="text-xs">Template</Label>
                    <Input
                      value={templates[l3.id]?.template ?? ""}
                      onChange={e => setTemplates(prev => ({ 
                        ...prev, 
                        [l3.id]: { ...(prev[l3.id] || {}), template: e.target.value, slot_span: prev[l3.id]?.slot_span ?? 1 } 
                      }))}
                      placeholder="e.g., D, A, F{inputs}, B{numberOfBushings}"
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Slot Span</Label>
                    <Input
                      type="number"
                      value={templates[l3.id]?.slot_span ?? (l3.specifications?.slotRequirement as any) ?? 1}
                      onChange={e => setTemplates(prev => ({ 
                        ...prev, 
                        [l3.id]: { ...(prev[l3.id] || {}), template: prev[l3.id]?.template || "", slot_span: parseInt(e.target.value) || 1 } 
                      }))}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded border border-border p-2">
                    <div>
                      <Label className="text-xs">Standard item</Label>
                      <div className="text-foreground/70 text-xs">Auto-included in build</div>
                    </div>
                    <Switch
                      checked={!!templates[l3.id]?.is_standard}
                      onCheckedChange={(v) => setTemplates(prev => ({
                        ...prev,
                        [l3.id]: { ...(prev[l3.id] || {}), is_standard: v }
                      }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label className="text-xs">Std Position</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 8"
                      value={templates[l3.id]?.standard_position ?? ""}
                      onChange={(e) => setTemplates(prev => ({
                        ...prev,
                        [l3.id]: { ...(prev[l3.id] || {}), standard_position: e.target.value === '' ? null : (parseInt(e.target.value) || 0) }
                      }))}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded border border-border p-2">
                    <div>
                      <Label className="text-xs">Outside chassis</Label>
                      <div className="text-foreground/70 text-xs">Shown in Accessories</div>
                    </div>
                    <Switch
                      checked={!!templates[l3.id]?.outside_chassis}
                      onCheckedChange={(v) => setTemplates(prev => ({
                        ...prev,
                        [l3.id]: { ...(prev[l3.id] || {}), outside_chassis: v }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded border border-border p-2">
                    <div>
                      <Label className="text-xs">Designated only</Label>
                      <div className="text-foreground/70 text-xs">Restrict to specific slots</div>
                    </div>
                    <Switch
                      checked={!!templates[l3.id]?.designated_only}
                      onCheckedChange={(v) => setTemplates(prev => ({
                        ...prev,
                        [l3.id]: { ...(prev[l3.id] || {}), designated_only: v }
                      }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 items-center">
                    <Label className="text-xs">Allowed slots</Label>
                    <Input
                      placeholder="e.g., 1,2,8"
                      value={templates[l3.id]?.designated_positions_str ?? (templates[l3.id]?.designated_positions?.join(',') || '')}
                      onChange={(e) => setTemplates(prev => ({
                        ...prev,
                        [l3.id]: { ...(prev[l3.id] || {}), designated_positions_str: e.target.value }
                      }))}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Input
                      placeholder="Optional notes"
                      value={templates[l3.id]?.notes ?? ''}
                      onChange={(e) => setTemplates(prev => ({
                        ...prev,
                        [l3.id]: { ...(prev[l3.id] || {}), notes: e.target.value }
                      }))}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={saveConfig} disabled={!selectedL2 || loading} className="bg-primary hover:bg-primary/90">Save Configuration</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PartNumberConfigManager;
