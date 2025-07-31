from setuptools import setup, find_packages # type: ignore

setup(
    name="emporia-flask-api",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "Flask==2.3.3",
        "flask-cors==4.0.0",
        "pyemvue==0.18.9",
        "gunicorn==21.2.0",
    ],
    python_requires=">=3.8",
) 