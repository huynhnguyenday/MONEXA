const characters = new Intl.Segmenter('vi', { granularity: 'grapheme' });

export default function ExpenseTitle({ title, desktopTitle }: { title: string; desktopTitle: string }) {
  const letters = Array.from(characters.segment(title), ({ segment }) => segment);
  const visible = letters.length > 45 ? [...letters.slice(0, 42), '.', '.', '.'] : letters;
  const lines = Array.from({ length: Math.ceil(visible.length / 15) }, (_, index) =>
    visible.slice(index * 15, (index + 1) * 15).join(''),
  );
  return (
    <span className="expense-name" title={title}>
      <span className="expense-title-desktop">{desktopTitle}</span>
      <span className="expense-title-mobile">
        <span className="sr-only">{title}</span>
        <span aria-hidden="true">
          {lines.map((line, index) => <span className="expense-title-line" key={index}>{line}</span>)}
        </span>
      </span>
    </span>
  );
}
