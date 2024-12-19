import torch
import torch.nn.functional as F


class KnowledgeDistillation:
    def __init__(self, teacher, student, temperature=2.0, alpha=0.5):
        self.teacher = teacher
        self.student = student
        self.temperature = temperature
        self.alpha = alpha