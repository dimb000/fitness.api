import {
  GraphQLNonNull,
  GraphQLID
} from 'graphql';

import { foodHistoryType, foodHistoryInputType } from '../../../types/foodHistory';
import UserModel from '../../../../models/user';
import FoodModel from '../../../../models/food';

export default {
  type: foodHistoryType,
  args: {
    userId: {
      name: 'userId',
      type: new GraphQLNonNull(GraphQLID)
    },
    data: {
      name: 'data',
      type: new GraphQLNonNull(foodHistoryInputType)
    }
  },
  resolve(root, params, context) {
    if (!context.user) {
      throw new Error('You have not access');
    }

    return new Promise((resolve, reject) => {
      UserModel.findById(params.userId).exec()
        .then(user => {
          const foodIds = params.data.foods.map(foodItem => foodItem.food);

          FoodModel.find({ _id: { $in: foodIds }}).exec()
            .then(foods => {
              const foodHistoryItem = params.data;

              foodHistoryItem.nutrients = {
                proteins: 0,
                carbohydrates: 0,
                fats: 0
              };
              foodHistoryItem.calorificValue = 0;

              foods.forEach((food, foodIndex) => {
                foodHistoryItem.calorificValue += food.calorificValue * params.data.foods[foodIndex].weight / 100;
                foodHistoryItem.nutrients.proteins += food.proteins * params.data.foods[foodIndex].weight / 100;
                foodHistoryItem.nutrients.carbohydrates += food.carbohydrates * params.data.foods[foodIndex].weight / 100;
                foodHistoryItem.nutrients.fats += food.fats * params.data.foods[foodIndex].weight / 100;
              });

              user.foodHistory = [ ...user.foodHistory, foodHistoryItem ];

              user.save()
                .then(data =>
                  UserModel.findById(user.userId).populate('foodHistory.foods.food').exec()
                    .then(data => resolve(data.foodHistory[data.foodHistory.length - 1]))
                )
                .catch(err => new Error('Could not update user data ', err));
            })
            .catch(err => new Error('Could not update user data ', err));
        });
    });
  }
}