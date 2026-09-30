import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { RatingStars } from '@/components/rating-stars';
import { Txt } from '@/components/txt';
import { getSubject } from '@/mocks/subjects';
import type { Review } from '@/types/session';
import { formatDate } from '@/utils/format';

export function ReviewCard({ review }: { review: Review }) {
  const subject = getSubject(review.subjectCode);

  return (
    <Card>
      <View style={styles.header}>
        <Avatar name={review.author} size={36} />
        <View style={styles.flex}>
          <Txt variant="label">{review.author}</Txt>
          <Txt variant="caption" color="muted">
            {subject?.name ?? review.subjectCode} · {formatDate(review.date)}
          </Txt>
        </View>
        <RatingStars value={review.rating} size={14} />
      </View>
      <Txt variant="body">{review.comment}</Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
});
