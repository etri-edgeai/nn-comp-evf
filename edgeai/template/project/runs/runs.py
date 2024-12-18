import os
import json
import yaml
import torch
import importlib
import sys
import logging

# Configure logging
logging.basicConfig(filename='runs.log', level=logging.INFO)

# Example usage in the Trainer class
def train(self):
    try:
        # Training logic
        logging.info(f"Training started for {self.config['experiment_name']}")
    except Exception as e:
        logging.error(f"An error occurred during training: {str(e)}")
        raise

def load_config():
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    return config

def load_meta():
    with open('meta.json', 'r') as f:
        meta = json.load(f)
    return meta

def main():
    # Load configurations
    config = load_config()
    meta = load_meta()

    # Update sys.path to include the project directories
    sys.path.append(os.path.join(os.getcwd(), 'models'))
    sys.path.append(os.path.join(os.getcwd(), 'datasets'))
    sys.path.append(os.path.join(os.getcwd(), 'experiments', config['experiment_name'], 'src'))

    # Dynamically import the selected model and dataset
    model_module = importlib.import_module(config['model']['module'])
    dataset_module = importlib.import_module(config['dataset']['module'])

    # Instantiate model and dataset
    model = model_module.Model()
    dataset = dataset_module.Dataset()

    # Import custom components from the experiment's src
    augmentation = importlib.import_module('augmentation')
    preprocess = importlib.import_module('preprocess')
    metric = importlib.import_module('metric')
    loss_fn = importlib.import_module('loss')
    optimizer_fn = importlib.import_module('optimizer')
    callbacks = importlib.import_module('callbacks')

    # Initialize Trainer
    trainer = Trainer(
        model=model,
        dataset=dataset,
        config=config,
        augmentation=augmentation,
        preprocess=preprocess,
        metric=metric,
        loss_fn=loss_fn,
        optimizer_fn=optimizer_fn,
        callbacks=callbacks
    )

    # Start training
    trainer.train()


class Trainer:
    def __init__(self, model, dataset, config, augmentation, preprocess, metric, loss_fn, optimizer_fn, callbacks):
        self.model = model
        self.dataset = dataset
        self.config = config
        self.augmentation = augmentation
        self.preprocess = preprocess
        self.metric = metric
        self.loss_fn = loss_fn
        self.optimizer_fn = optimizer_fn
        self.callbacks = callbacks
        self.optimizer = self.optimizer_fn(self.model.parameters())
        self.loss_function = self.loss_fn()
        # Initialize other components as needed

    def train(self):
        num_epochs = self.config['training']['epochs']
        for epoch in range(num_epochs):
            # Training loop
            self.model.train()
            for batch in self.dataset.train_loader():
                # Apply preprocessing and augmentation
                inputs, targets = self.preprocess(batch)
                inputs = self.augmentation(inputs)
                # Forward pass
                outputs = self.model(inputs)
                loss = self.loss_function(outputs, targets)
                # Backward pass and optimization
                self.optimizer.zero_grad()
                loss.backward()
                self.optimizer.step()
            # Validation and metrics
            self.validate(epoch)
            # Callbacks
            self.callbacks.on_epoch_end(epoch, self.model)

    def validate(self, epoch):
        self.model.eval()
        with torch.no_grad():
            for batch in self.dataset.val_loader():
                inputs, targets = self.preprocess(batch)
                outputs = self.model(inputs)
                # Calculate metrics
                metric_value = self.metric(outputs, targets)
        print(f"Epoch {epoch}: Metric Value = {metric_value}")



if __name__ == '__main__':
    main()
