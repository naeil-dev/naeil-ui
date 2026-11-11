import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import { Button, CardElevated, CardHeader, CardTitle, CardDescription, CardContent, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, Toaster } from "../components/ui";
import { PageTitle, SectionTitle } from "../components/typography";

const copy = {
  ko: { title: "워크스페이스 설정", section: "알림 환경", body: "변경사항을 확인하고 안전하게 저장합니다.", action: "확인", close: "닫기", undo: "취소", toast: "설정을 저장했습니다." },
  ja: { title: "ワークスペース設定", section: "通知設定", body: "変更内容を確認してから安全に保存します。", action: "確認", close: "閉じる", undo: "元に戻す", toast: "設定を保存しました。" },
  en: { title: "Workspace settings", section: "Notifications", body: "Review the changes before saving your workspace preferences.", action: "Confirm", close: "Close", undo: "Undo", toast: "Settings saved." },
};
type Props = { locale: keyof typeof copy };
const meta = { title: "UI/Audit defaults", args: { locale: "en" }, argTypes: { locale: { control: "select", options: ["ko", "ja", "en"] } } } satisfies Meta<Props>;
export default meta;
type Story = StoryObj<Props>;

function PressedButtons({ locale }: Props) {
  const [pressed, setPressed] = useState(true);
  return <div lang={locale} className="grid gap-4 max-w-xl">
    {(["default", "destructive", "outline", "secondary", "ghost", "link"] as const).map(variant => <div key={variant} className="flex items-center gap-4">
      <Button variant={variant} aria-pressed={false}>{variant}</Button>
      <Button variant={variant} aria-pressed={pressed} onClick={() => setPressed(!pressed)}>{copy[locale].action}</Button>
    </div>)}
  </div>;
}
export const ButtonPressed: Story = { render: args => <PressedButtons {...args} /> };
export const TallDialog: Story = { render: ({ locale }) => <div lang={locale}>
  <Dialog><DialogTrigger asChild><Button>{copy[locale].title}</Button></DialogTrigger>
    <DialogContent lang={locale} showCloseButton={false}>
      <DialogHeader><DialogTitle>{copy[locale].title}</DialogTitle><DialogDescription>{copy[locale].body}</DialogDescription></DialogHeader>
      {Array.from({ length: 24 }, (_, index) => <p key={index}>{index + 1}. {copy[locale].body}</p>)}
      <DialogFooter><DialogClose asChild><Button>{copy[locale].close}</Button></DialogClose></DialogFooter>
    </DialogContent>
  </Dialog>
</div> };
export const TypographyCard: Story = { render: ({ locale }) => <div lang={locale} className="grid max-w-xl gap-6">
  <PageTitle>{copy[locale].title}</PageTitle><SectionTitle>{copy[locale].section}</SectionTitle>
  <CardElevated><CardHeader><CardTitle>{copy[locale].title}</CardTitle><CardDescription>{copy[locale].body}</CardDescription></CardHeader>
    <CardContent className="grid gap-4"><p>{copy[locale].body}</p><p className="text-base leading-relaxed">{copy[locale].body}</p><p className="text-xs">{copy[locale].section}</p></CardContent>
  </CardElevated>
</div> };
function ToastTargetsExample({ locale, direction = "ltr" }: Props & { direction?: "ltr" | "rtl" }) { return <div lang={locale}>
  <Button onClick={() => toast.success(copy[locale].toast, { duration: Infinity, action: { label: copy[locale].undo, onClick: () => toast.dismiss() } })}>{copy[locale].action}</Button>
  <Toaster dir={direction} closeButton toastOptions={{ closeButtonAriaLabel: copy[locale].close }} />
</div>; }
export const ToastTargets: Story = { render: args => <ToastTargetsExample {...args} /> };
export const ToastTargetsRtl: Story = { render: args => <ToastTargetsExample {...args} direction="rtl" /> };
