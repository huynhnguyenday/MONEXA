// Keep push text intact while emphasizing formatted VND values and due dates.
export default function NotificationBody({ body }: { body: string }) {
  return body.split(/(\d[\d.,\u00a0 ]*\s*[₫đ]|\d{2}\/\d{2}\/\d{4})/gu).map((part, index) =>
    /^(?:\d[\d.,\u00a0 ]*\s*[₫đ]|\d{2}\/\d{2}\/\d{4})$/u.test(part) ? (
      <b className="notification-important" key={index}>
        {part}
      </b>
    ) : (
      part
    ),
  );
}
