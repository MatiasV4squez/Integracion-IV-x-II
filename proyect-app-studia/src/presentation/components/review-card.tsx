import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/presentation/components/avatar';
import { Card } from '@/presentation/components/card';
import { RatingStars } from '@/presentation/components/rating-stars';
import { Txt } from '@/presentation/components/txt';
import { getSubject } from '@/di/demo';
import type { Review } from '@/domain/sesiones/session';
import { formatDate } from '@/shared/format';

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
