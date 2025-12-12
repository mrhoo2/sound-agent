# Product Context: Sound Agent

## Why This Project Exists
HVAC sound compliance is a tedious, error-prone process. Engineers, purchasers, and sales reps constantly need to:
- Convert between different sound measurement systems (sones, NC, dBA, octave bands)
- Cross-reference design requirements against equipment submittals
- Extract sound data from various document formats

This tool automates these workflows, reducing manual errors and saving time.

## Problems It Solves
- **Manual conversion errors**: Converting between sones, NC, dBA, and frequency bands is complex and error-prone
- **Document hunting**: Sound requirements are buried in schedules, specs, and PDFs
- **Compliance verification**: Manually checking if equipment meets design criteria is time-consuming
- **Inconsistent data formats**: Manufacturers report sound data differently (some use sones, others NC, etc.)

## How It Should Work

### Design Engineer Workflow
1. Describe the space type and requirements
2. Get recommendations from reliable sources (ASHRAE Handbooks)
3. Receive appropriate sound criteria for the space

### Purchasing Agent Workflow
1. Upload design documents (mechanical schedules, specifications)
2. Upload equipment submittals (PDFs, screenshots, links)
3. Get automated compliance check: "Does this equipment meet the spec?"

### Sales Rep Workflow
1. Upload customer requirements
2. Upload product data
3. Get clear pass/fail assessment with supporting details

## User Personas

### HVAC Design Engineer
- Needs to set appropriate sound criteria for spaces
- References ASHRAE Handbooks for guidance
- Values technical accuracy and reliable sourcing

### HVAC Equipment Purchaser
- Needs to verify equipment meets design specifications
- Works with various document formats
- Values quick, clear compliance answers

### HVAC Sales Representative
- Needs to demonstrate product compliance to customers
- May need to show conversions (e.g., "our product is X sones = Y NC")
- Values clear documentation to share with clients

## Key Features
- Sound unit conversions (sones ↔ NC ↔ dBA ↔ octave bands)
- Document parsing (PDFs, screenshots, schedules)
- ASHRAE-based recommendations for space types
- Automated compliance checking
- Multi-format input support

## Success Metrics
- Accuracy of conversions against known reference values
- Time saved vs manual compliance checking
- Successful document parsing rate
- User satisfaction across all three personas

---
*This document captures the "why" behind the project. Reference it to ensure development stays aligned with user needs.*
