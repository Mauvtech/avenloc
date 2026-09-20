import 'reflect-metadata';
import { validate } from 'class-validator';
import { LeadHostDto } from './create-lead.dto';

describe('commercial recipient contact', () => {
  async function errors(contact: Partial<LeadHostDto>) {
    return validate(Object.assign(new LeadHostDto(), { firstName: 'Marie', lastName: 'Dupont' }, contact));
  }
  it('accepts an email without a phone number', async () => {
    expect(await errors({ email: 'marie@example.com' })).toHaveLength(0);
  });
  it('accepts a phone number without inventing an email in the form', async () => {
    expect(await errors({ phone: '+33 6 12 34 56 78' })).toHaveLength(0);
  });
  it('requires at least one valid contact and validates both when supplied', async () => {
    expect((await errors({})).length).toBeGreaterThan(0);
    expect((await errors({ phone: 'invalide' })).length).toBeGreaterThan(0);
    expect((await errors({ phone: '........' })).length).toBeGreaterThan(0);
    expect((await errors({ email: 'invalide', phone: '+33612345678' })).length).toBeGreaterThan(0);
  });
});
