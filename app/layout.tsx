import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rodinha API",
  description: "Gatekeeper e cache para o gateway onde estão os beats",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
