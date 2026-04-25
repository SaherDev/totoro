import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { DeleteUserDataQueryDto } from './delete-user-data.query.dto';

const transform = (raw: Record<string, unknown>): DeleteUserDataQueryDto =>
  plainToInstance(DeleteUserDataQueryDto, raw);

describe('DeleteUserDataQueryDto', () => {
  it('leaves scope undefined when no query string is provided', () => {
    const dto = transform({});
    expect(validateSync(dto)).toEqual([]);
    expect(dto.scope).toBeUndefined();
  });

  it('wraps a single scope string into an array', () => {
    const dto = transform({ scope: 'chat_history' });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.scope).toEqual(['chat_history']);
  });

  it('passes a repeated scope array through unchanged', () => {
    const dto = transform({ scope: ['chat_history', 'all'] });
    expect(validateSync(dto)).toEqual([]);
    expect(dto.scope).toEqual(['chat_history', 'all']);
  });

  it('rejects an unknown scope value', () => {
    const dto = transform({ scope: 'bogus' });
    const errors = validateSync(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isIn');
  });

  it('rejects a repeated scope set containing an unknown value', () => {
    const dto = transform({ scope: ['chat_history', 'bogus'] });
    const errors = validateSync(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('isIn');
  });
});
