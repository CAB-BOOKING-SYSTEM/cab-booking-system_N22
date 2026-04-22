interface PageIntroProps {
  title: string;
  description: string;
}

export function PageIntro({ title, description }: PageIntroProps) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}
