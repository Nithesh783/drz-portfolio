import { parsePortfolioHtml } from "@/lib/portfolioHtmlParser";
import { resolvePortfolioMarkup } from "@/lib/portfolioMarkup";

type PortfolioSectionProps = {
  markup: string;
};

export function PortfolioSection({ markup }: PortfolioSectionProps) {
  return <>{parsePortfolioHtml(resolvePortfolioMarkup(markup))}</>;
}
