const { ApiService } = require('../services/apiService');
const axios = require('axios');

jest.mock('axios');

describe('ApiService', () => {
  let apiService;
  const mockConfig = {
    apis: [
      {
        id: 'get_posts',
        method: 'GET',
        url: '/posts',
        parameters: {},
        headers: {},
        mapping: [
          { source: 'id', target: 'post_id' },
          { source: 'title', target: 'title' },
          { source: 'userId', target: 'user_id' }
        ],
        host: 'jsonplaceholder.typicode.com'
      }
    ]
  };

  beforeEach(() => {
    apiService = new ApiService(mockConfig);
    jest.clearAllMocks();
  });

  describe('fetchData', () => {
    it('should fetch and transform data correctly', async () => {
      const mockResponse = {
        data: [
          { id: 1, title: 'Test Post', userId: 1 }
        ]
      };
      
      axios.mockResolvedValue(mockResponse);
      
      const result = await apiService.fetchData('get_posts');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      
      const firstItem = result[0];
      expect(firstItem).toEqual({
        post_id: 1,
        title: 'Test Post',
        user_id: 1
      });
    });

    it('should handle API errors gracefully', async () => {
      const invalidConfig = {
        apis: [{
          id: 'invalid_api',
          method: 'GET',
          url: '/invalid',
          host: 'invalid-host.com'
        }]
      };
      
      axios.mockRejectedValue(new Error('Network error'));
      
      const invalidService = new ApiService(invalidConfig);
      await expect(invalidService.fetchData('invalid_api')).rejects.toThrow('Network error');
    });
  });

  describe('transformData', () => {
    it('should transform data according to mapping rules', () => {
      const mockData = [{
        id: 1,
        title: 'Test Title',
        userId: 123
      }];

      const transformed = apiService.transformData(mockData, mockConfig.apis[0].mapping);
      
      expect(transformed[0]).toEqual({
        post_id: 1,
        title: 'Test Title',
        user_id: 123
      });
    });

    it('should handle missing fields gracefully', () => {
      const mockData = [{
        id: 1
        // missing title and userId
      }];

      const transformed = apiService.transformData(mockData, mockConfig.apis[0].mapping);
      
      expect(transformed[0]).toEqual({
        post_id: 1,
        title: undefined,
        user_id: undefined
      });
    });
  });
}); 