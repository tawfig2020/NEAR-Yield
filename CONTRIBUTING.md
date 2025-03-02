# Contributing to NEAR Deep Yield

## 👋 Welcome

Thank you for considering contributing to NEAR Deep Yield! This document provides guidelines and instructions for contributing.

## 📋 Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to maintain a positive and inclusive community.

## 🚀 Getting Started

1. **Fork the Repository**
   - Click the Fork button on GitHub
   - Clone your fork locally
   ```bash
   git clone https://github.com/your-username/near-deep-yield.git
   ```

2. **Set Up Development Environment**
   - Follow setup instructions in [Developer Documentation](docs/developer/README.md)
   - Install dependencies
   ```bash
   cd near-deep-yield
   npm install
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 💻 Development Workflow

### Branch Naming Convention

- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates
- `test/*` - Test improvements
- `refactor/*` - Code refactoring

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

Example:
```
feat(staking): add auto-compound functionality

- Implement automatic reward reinvestment
- Add user preferences for compound frequency
- Update tests
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep="YieldStrategy"

# Run with coverage
npm run test:coverage
```

### Writing Tests

1. **Unit Tests**
```javascript
describe('YieldStrategy', () => {
  it('should calculate rewards correctly', () => {
    // Test implementation
  });
});
```

2. **Integration Tests**
```javascript
describe('Staking Flow', () => {
  it('should stake tokens and update balance', async () => {
    // Test implementation
  });
});
```

## 📝 Documentation

### Code Documentation

- Use JSDoc comments for functions
- Document complex algorithms
- Include examples for API methods

Example:
```javascript
/**
 * Calculate yield rewards for a staking position
 * @param {string} amount - Staked amount in yoctoNEAR
 * @param {number} duration - Staking duration in seconds
 * @returns {Promise<string>} Reward amount in yoctoNEAR
 */
async calculateRewards(amount, duration) {
  // Implementation
}
```

### API Documentation

Update API documentation when adding/modifying endpoints:

```markdown
### `POST /api/v1/strategy/stake`
Stake tokens in the yield strategy.

**Request:**
\`\`\`json
{
  "amount": "1000000000000000000000000"
}
\`\`\`
```

## 🔍 Code Review Process

1. **Before Submitting**
   - Run all tests
   - Update documentation
   - Check code style
   - Add/update tests

2. **Pull Request Template**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Performance improvement

   ## Testing
   Describe testing approach

   ## Screenshots
   If applicable
   ```

3. **Review Process**
   - Two approvals required
   - All tests must pass
   - Documentation updated
   - No merge conflicts

## 🐛 Bug Reports

### Issue Template

```markdown
## Bug Description
Clear description of the issue

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS:
- Browser:
- Version:
```

## 🎨 Style Guide

### JavaScript

```javascript
// Use const/let, avoid var
const config = {
  // Use meaningful names
  maxRetries: 3,
  timeout: 5000
};

// Use async/await
async function fetchData() {
  try {
    const result = await api.getData();
    return result;
  } catch (error) {
    handleError(error);
  }
}
```

### React Components

```javascript
// Use functional components
function YieldCard({ data, onStake }) {
  // Use hooks at the top
  const [loading, setLoading] = useState(false);

  // Group related logic
  const handleStake = useCallback(() => {
    // Implementation
  }, [onStake]);

  return (
    <div className="yield-card">
      {/* JSX */}
    </div>
  );
}
```

## 🎉 Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in documentation

## ❓ Questions?

- Join our Discord server
- Check existing issues
- Email contributors@example.com
