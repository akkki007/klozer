/* eslint-disable @next/next/no-img-element */

type Avatar = { imageUrl: string; profileUrl?: string };

/**
 * Dependency-free take on Magic UI's <AvatarCircles>: a row of overlapping
 * avatars with a trailing "+N" badge. Theme-aware ring (var(--bg)) so it reads
 * on both light and dark. Presentational only — safe in a Server Component.
 */
export default function AvatarCircles({
  numPeople,
  avatarUrls,
  size = 38,
}: {
  numPeople?: number;
  avatarUrls: Avatar[];
  size?: number;
}) {
  const overlap = -Math.round(size * 0.34);

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {avatarUrls.map((a, i) => {
        const img = (
          <img
            src={a.imageUrl}
            alt=""
            width={size}
            height={size}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              border: "2px solid var(--bg)",
              objectFit: "cover",
              background: "var(--bg-soft)",
              display: "block",
            }}
          />
        );
        const wrapStyle: React.CSSProperties = {
          marginLeft: i === 0 ? 0 : overlap,
          display: "block",
          transition: "transform 0.18s ease",
        };
        return a.profileUrl ? (
          <a key={i} href={a.profileUrl} target="_blank" rel="noreferrer" style={wrapStyle}>
            {img}
          </a>
        ) : (
          <span key={i} style={wrapStyle}>
            {img}
          </span>
        );
      })}

      {numPeople != null && (
        <div
          style={{
            width: size,
            height: size,
            marginLeft: overlap,
            borderRadius: "50%",
            border: "2px solid var(--bg)",
            background: "var(--accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.round(size * 0.3),
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          +{numPeople}
        </div>
      )}
    </div>
  );
}
