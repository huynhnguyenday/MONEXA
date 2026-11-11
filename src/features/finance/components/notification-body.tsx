// Keep push text intact while emphasizing amounts, remaining time and due dates.
export default function NotificationBody({ body }: { body: string }) {
  return body
    .split(
      /(\d[\d.,\u00a0 ]*\s*(?:đồng|₫|đ)|\d{2}\/\d{2}\/\d{4}|trong hôm nay|trong \d+ ngày nữa|quá hạn \d+ ngày)/gu,
    )
    .map((part, index) =>
      index % 2 === 1 ? (
        <b className="notification-important" key={index}>
          {part}
        </b>
      ) : (
        part
      ),
    );
}
