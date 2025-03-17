from django.db import models
import cloudinary.models


# University Model
class University(models.Model):
    name = models.CharField(max_length=255)
    image = cloudinary.models.CloudinaryField('image')  
    created_at = models.DateTimeField(auto_now_add=True)
    required_courses_count = models.PositiveIntegerField(default=0)
    required_average_rating = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'universities'

    def __str__(self):
        return self.name
