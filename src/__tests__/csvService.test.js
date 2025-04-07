const { CsvService } = require('../services/csvService');

describe('CsvService', () => {
  let csvService;

  beforeEach(() => {
    csvService = new CsvService();
  });

  describe('convertToCsv', () => {
    it('should convert data to CSV format', () => {
      const data = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' }
      ];

      const csv = csvService.convertToCsv(data);
      expect(csv).toBe('id,name,email\n1,John,john@example.com\n2,Jane,jane@example.com');
    });

    it('should handle empty data', () => {
      expect(csvService.convertToCsv([])).toBe('');
    });

    it('should handle data with missing fields', () => {
      const data = [
        { post_id: 1, title: 'Test 1' },
        { post_id: 2, user_id: 2 }
      ];

      const csv = csvService.convertToCsv(data);
      expect(csv).toBe('post_id,title,user_id\n1,Test 1,\n2,,2');
    });

    it('should handle special characters in data', () => {
      const data = [
        { id: 1, name: 'John, Jr.', email: 'john@example.com' }
      ];

      const csv = csvService.convertToCsv(data);
      expect(csv).toBe('id,name,email\n1,"John, Jr.",john@example.com');
    });
  });
}); 