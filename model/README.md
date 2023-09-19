The model is based on https://github.com/ZackAkil/deep-tic-tac-toe.
To convert the original (js) model to the protobuf one, run:

```python
import tensorflowjs as tfjs

model = tfjs.converters.load_keras_model("{path-to}/deep-tic-tac-toe/model/model.json")
model.save("model-pb/01")
```