import 'reflect-metadata';
import { CommercialService } from './commercial.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed-password') }));

describe('activation after a commercial phone invitation', () => {
  function setup(hostEmail = '') {
    const prisma = {
      hostInvitation: {
        findUnique: jest.fn().mockResolvedValue({ id: 'invitation', status: 'SENT', hostEmail, listingId: 'listing', establishment: { hostId: 'host' } }),
        update: jest.fn().mockResolvedValue({}),
      },
      listing: { update: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({ id: 'host' }) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
    const auth = { issueTokens: jest.fn().mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }) };
    const service = new CommercialService(prisma as never, auth as never);
    return { service, prisma, auth };
  }

  it('requires a login email before accepting a phone-only invitation', async () => {
    const { service, prisma } = setup();
    await expect(service.acceptInvitation('token', { password: 'password123' })).rejects.toThrow('Renseignez votre email');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('saves the real email and password together with activation', async () => {
    const { service, prisma, auth } = setup();
    await service.acceptInvitation('token', { password: 'password123', email: 'Marie@Example.com' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'host' }, data: { hashedPassword: 'hashed-password', email: 'marie@example.com' } });
    expect(prisma.listing.update).toHaveBeenCalledWith({ where: { id: 'listing' }, data: { status: 'DRAFT' } });
    expect(auth.issueTokens).toHaveBeenCalledWith({ id: 'host' });
  });

  it('does not consume an invitation when the email belongs to another account', async () => {
    const { service, prisma } = setup();
    prisma.user.findUnique.mockResolvedValue({ id: 'another-host' });
    await expect(service.acceptInvitation('token', { password: 'password123', email: 'taken@example.com' })).rejects.toThrow('déjà utilisé');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('preserves the email on invitations that already identify an email account', async () => {
    const { service, prisma } = setup('original@example.com');
    await service.acceptInvitation('token', { password: 'password123', email: 'replacement@example.com' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'host' }, data: { hashedPassword: 'hashed-password' } });
  });
});
