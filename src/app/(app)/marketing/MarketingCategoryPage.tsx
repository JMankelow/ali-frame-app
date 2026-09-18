import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MarketingAssetForm } from "./MarketingAssetForm";
import { MarketingAssetRow } from "./MarketingAssetRow";
import type { MarketingCategory } from "./categories";

export async function MarketingCategoryPage({
  category,
  title,
  subtitle,
}: {
  category: MarketingCategory;
  title: string;
  subtitle: string;
}) {
  await requireUser();

  const assets = await prisma.marketingAsset.findMany({
    where: { category },
    include: { uploadedBy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{title}</h2>
          <div className="subtitle">{subtitle}</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Added By</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <MarketingAssetRow
                key={a.id}
                id={a.id}
                title={a.title}
                description={a.description}
                linkUrl={a.linkUrl}
                fileName={a.fileName}
                uploadedByName={a.uploadedBy.name}
                date={a.createdAt.toLocaleDateString("en-NZ")}
              />
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={4} className="hint">
                  Nothing here yet — add the first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MarketingAssetForm category={category} />
    </div>
  );
}
