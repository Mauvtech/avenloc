'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import AvailabilityCalendar from '@/components/availability-calendar';
import { PageLoader } from '@/components/ui';
import { typeLabel } from '@/lib/listing';
import type { Listing } from '@/lib/types';

export default function ListingCalendarPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    Promise.all([api.auth.me(), api.listings.getById(id)])
      .then(([me, l]) => {
        if (l.hostId !== me.id) {
          router.replace('/host');
          return;
        }
        setListing(l);
      })
      .catch(() => router.replace('/host'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return <PageLoader />;
  if (!listing) return null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/host" className="text-sm text-muted hover:text-ink">
        ← Mes annonces
      </Link>
      <div>
        <h1 className="text-2xl font-extrabold">Calendrier de disponibilité</h1>
        <p className="text-sm text-muted">
          {typeLabel(listing.type)} · {listing.title}
        </p>
      </div>

      <div className="card p-4">
        <AvailabilityCalendar listingId={listing.id} />
      </div>
    </div>
  );
}
