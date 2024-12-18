# Edge Vision Framework (EVF)

A web application framework for managing and optimizing deep learning models for edge devices with GPU support and real-time monitoring capabilities.

## Key Features

- 🚀 **Project Management**: Organize models, datasets, and experiments in isolated workspaces
- 🎯 **Model Training**: Train models with automatic GPU resource allocation
- 📊 **Real-time Monitoring**: Track training progress and system resource usage
- 🛠️ **Model Optimization**: Optimize models for edge deployment
- 📈 **Interactive Dashboard**: Monitor system resources and training metrics
- 👥 **Multi-user Support**: Secure authentication and workspace isolation

## Installation

### Prerequisites

- Python 3.8+
- CUDA-compatible GPU
- Node.js 14+ (for frontend development)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/nn-comp-evf.git
cd nn-comp-evf
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Initialize the application:
```bash
python init.sh
```

5. Start the server:
```bash
python app.py
```

The application will be available at `http://localhost:5001`

## Basic Usage

1. Create a new project from the dashboard
2. Upload or configure your dataset
3. Define your model architecture
4. Start a training run with GPU allocation
5. Monitor training progress in real-time

## License

Apache 2.0 License - see [LICENSE](LICENSE) for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.